from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    Request,
    UploadFile,
    status,
)
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database import get_async_session
from backend.dependencies import get_current_user

router = APIRouter()

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/csv",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
}
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".csv", ".xlsx", ".xls"}
MAX_FILE_SIZE_MB = 50
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class DocumentResponse(BaseModel):
    id: str
    filename: str
    mime_type: str
    size_bytes: int
    status: str = "uploaded"
    created_at: str


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int


class DocumentAskRequest(BaseModel):
    question: str = Field(min_length=1, max_length=10000)


class DocumentAskResponse(BaseModel):
    answer: str
    citations: list[dict] = []


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _validate_file(file: UploadFile) -> None:
    """Validate file type and size."""
    import os

    ext = os.path.splitext(file.filename or "")[1].lower()

    content_type = file.content_type or ""
    if ext not in ALLOWED_EXTENSIONS and content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"File type not allowed. "
                f"Supported types: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
            ),
        )


async def _validate_file_size(file: UploadFile) -> bytes:
    """Read the file and validate its size, returning the bytes."""
    contents = await file.read()
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the maximum size of {MAX_FILE_SIZE_MB}MB",
        )
    return contents


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "",
    response_model=DocumentListResponse,
    summary="List all documents for the current user",
)
async def list_documents(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> DocumentListResponse:
    """Return a paginated list of uploaded documents."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    result = await db.execute(
        text(
            """
            SELECT id, filename, mime_type, size_bytes, status, created_at
            FROM documents
            WHERE user_id = :uid
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        {"uid": user_id, "limit": limit, "offset": offset},
    )
    rows = result.fetchall()

    count_result = await db.execute(
        text("SELECT COUNT(*) FROM documents WHERE user_id = :uid"),
        {"uid": user_id},
    )
    total = count_result.scalar() or 0

    documents = [
        DocumentResponse(
            id=str(row.id),
            filename=row.filename,
            mime_type=row.mime_type,
            size_bytes=row.size_bytes,
            status=row.status,
            created_at=row.created_at.isoformat() if row.created_at else "",
        )
        for row in rows
    ]

    return DocumentListResponse(documents=documents, total=total)


@router.post(
    "/upload",
    response_model=DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a document (PDF, DOCX, CSV, XLSX)",
)
async def upload_document(
    file: UploadFile = File(...),
    request: Request = None,  # type: ignore[assignment]
    db: AsyncSession = Depends(get_async_session),
) -> DocumentResponse:
    """Upload a document file for processing.

    Accepted formats: PDF, DOCX, CSV, XLSX. Maximum file size is 50MB.
    The file is stored in Supabase Storage and queued for background indexing.
    """
    _validate_file(file)
    file_bytes = await _validate_file_size(file)

    from backend.dependencies import get_current_user

    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    doc_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    storage_path = f"{user_id}/{doc_id}/{file.filename}"

    # ---- upload to Supabase Storage ----
    from supabase import acreate_client  # type: ignore[import-untyped]

    client = await acreate_client(
        settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY
    )

    try:
        await client.storage.from_(settings.STORAGE_BUCKET).upload(
            path=storage_path,
            file=file_bytes,
            file_options={"content-type": file.content_type or "application/octet-stream"},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to store file: {exc}",
        )

    # ---- persist metadata in database ----
    await db.execute(
        text(
            """
            INSERT INTO documents (id, user_id, filename, mime_type, size_bytes,
                                   storage_path, status, created_at)
            VALUES (:id, :uid, :filename, :mime, :size, :path, 'uploaded', :now)
            """
        ),
        {
            "id": doc_id,
            "uid": user_id,
            "filename": file.filename,
            "mime": file.content_type or "application/octet-stream",
            "size": len(file_bytes),
            "path": storage_path,
            "now": now,
        },
    )

    # ---- trigger background indexing ----
    try:
        from backend.workers.index_document import index_document_task  # type: ignore[import-untyped]

        index_document_task.delay(doc_id)  # type: ignore[attr-defined]
    except Exception:
        # Background worker may not be available; document is still uploaded
        pass

    return DocumentResponse(
        id=doc_id,
        filename=file.filename or "unknown",
        mime_type=file.content_type or "application/octet-stream",
        size_bytes=len(file_bytes),
        status="uploaded",
        created_at=now.isoformat(),
    )


@router.get(
    "/{document_id}",
    response_model=DocumentResponse,
    summary="Get document metadata by ID",
)
async def get_document(
    document_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> DocumentResponse:
    """Return metadata for a specific document."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    result = await db.execute(
        text(
            """
            SELECT id, filename, mime_type, size_bytes, status, created_at
            FROM documents
            WHERE id = :did AND user_id = :uid
            """
        ),
        {"did": document_id, "uid": user_id},
    )
    row = result.fetchone()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    return DocumentResponse(
        id=str(row.id),
        filename=row.filename,
        mime_type=row.mime_type,
        size_bytes=row.size_bytes,
        status=row.status,
        created_at=row.created_at.isoformat() if row.created_at else "",
    )


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a document and its embeddings",
)
async def delete_document(
    document_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> None:
    """Delete a document, its file in Supabase Storage, and its vector embeddings."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    # Fetch the document to get storage path
    result = await db.execute(
        text(
            """
            SELECT id, storage_path
            FROM documents
            WHERE id = :did AND user_id = :uid
            """
        ),
        {"did": document_id, "uid": user_id},
    )
    row = result.fetchone()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Delete from Supabase Storage
    from supabase import acreate_client  # type: ignore[import-untyped]

    client = await acreate_client(
        settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY
    )

    try:
        await client.storage.from_(settings.STORAGE_BUCKET).remove([row.storage_path])
    except Exception:
        # Continue even if storage removal fails
        pass

    # Delete vector embeddings
    try:
        from backend.services.vector_store import delete_document_embeddings  # type: ignore[import-untyped]

        await delete_document_embeddings(document_id)
    except Exception:
        pass

    # Delete database record
    await db.execute(
        text("DELETE FROM documents WHERE id = :did AND user_id = :uid"),
        {"did": document_id, "uid": user_id},
    )


@router.post(
    "/{document_id}/ask",
    response_model=DocumentAskResponse,
    summary="Ask a question about a specific document",
)
async def ask_about_document(
    document_id: str,
    body: DocumentAskRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> DocumentAskResponse:
    """Ask a natural-language question about a document's content.

    Uses the RAG engine to retrieve relevant chunks from the document's
    embeddings and generate an answer with citations.
    """
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    # Verify document ownership
    check = await db.execute(
        text(
            """
            SELECT id FROM documents
            WHERE id = :did AND user_id = :uid
            """
        ),
        {"did": document_id, "uid": user_id},
    )
    if check.fetchone() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found",
        )

    # Query the RAG engine scoped to this document
    try:
        from backend.services.rag_engine import query_document  # type: ignore[import-untyped]

        result = await query_document(
            document_id=document_id,
            question=body.question,
            user_id=user_id,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate answer: {exc}",
        )

    return DocumentAskResponse(
        answer=result.get("answer", ""),
        citations=result.get("citations", []),
    )
