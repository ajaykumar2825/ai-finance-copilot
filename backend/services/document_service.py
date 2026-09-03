from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from backend.database import async_session_factory
from backend.services.storage import delete_file, download_file, upload_file
from backend.utils.file_parser import (
    parse_csv,
    parse_docx,
    parse_pdf,
    parse_xlsx,
)
from backend.workers.document_worker import process_document_async

logger = logging.getLogger(__name__)


class DocumentService:
    """Upload, retrieve, and process user documents."""

    ALLOWED_TYPES = {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }
    EXTENSION_MAP = {
        "application/pdf": "pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
        "text/csv": "csv",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    }

    async def upload_document(
        self,
        user_id: str,
        file_data: bytes,
        filename: str,
        content_type: str,
    ) -> dict[str, Any]:
        if content_type not in self.ALLOWED_TYPES:
            raise ValueError(f"Unsupported file type: {content_type}. " f"Allowed: {', '.join(self.ALLOWED_TYPES)}")

        doc_id = str(uuid.uuid4())
        ext = self.EXTENSION_MAP.get(content_type, "bin")
        storage_path = f"{user_id}/{doc_id}.{ext}"
        now = datetime.now(timezone.utc)

        await upload_file(
            path=storage_path,
            file_data=file_data,
            content_type=content_type,
        )

        async with async_session_factory() as session:
            await session.execute(
                __import__("sqlalchemy").text(
                    """
                    INSERT INTO documents (
                        id, user_id, filename, content_type, storage_path,
                        status, created_at, updated_at
                    ) VALUES (
                        :id, :user_id, :filename, :content_type, :storage_path,
                        :status, :created_at, :updated_at
                    )
                    """
                ),
                {
                    "id": doc_id,
                    "user_id": user_id,
                    "filename": filename,
                    "content_type": content_type,
                    "storage_path": storage_path,
                    "status": "uploaded",
                    "created_at": now,
                    "updated_at": now,
                },
            )
            await session.commit()

        logger.info("Document %s uploaded for user %s", doc_id, user_id)

        return {
            "id": doc_id,
            "user_id": user_id,
            "filename": filename,
            "content_type": content_type,
            "storage_path": storage_path,
            "status": "uploaded",
            "created_at": now.isoformat(),
        }

    async def list_documents(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        async with async_session_factory() as session:
            result = await session.execute(
                __import__("sqlalchemy").text(
                    """
                    SELECT id, user_id, filename, content_type, storage_path,
                           status, chunk_count, created_at, updated_at
                    FROM documents
                    WHERE user_id = :user_id
                    ORDER BY created_at DESC
                    LIMIT :limit OFFSET :offset
                    """
                ),
                {"user_id": user_id, "limit": limit, "offset": offset},
            )
            return [dict(r) for r in result.mappings().all()]

    async def get_document(
        self,
        document_id: str,
        user_id: str,
    ) -> dict[str, Any] | None:
        async with async_session_factory() as session:
            result = await session.execute(
                __import__("sqlalchemy").text(
                    """
                    SELECT id, user_id, filename, content_type, storage_path,
                           status, chunk_count, created_at, updated_at
                    FROM documents
                    WHERE id = :doc_id AND user_id = :user_id
                    """
                ),
                {"doc_id": document_id, "user_id": user_id},
            )
            row = result.mappings().first()
            return dict(row) if row else None

    async def delete_document(self, document_id: str, user_id: str) -> bool:
        doc = await self.get_document(document_id, user_id)
        if doc is None:
            return False

        # Delete from storage
        await delete_file(paths=[doc["storage_path"]])

        # Delete vector chunks
        async with async_session_factory() as session:
            await session.execute(
                __import__("sqlalchemy").text("DELETE FROM document_chunks WHERE document_id = :doc_id"),
                {"doc_id": document_id},
            )
            result = await session.execute(
                __import__("sqlalchemy").text(
                    """
                    DELETE FROM documents
                    WHERE id = :doc_id AND user_id = :user_id
                    """
                ),
                {"doc_id": document_id, "user_id": user_id},
            )
            await session.commit()

        logger.info("Document %s deleted for user %s", document_id, user_id)
        return result.rowcount > 0

    async def process_document(
        self,
        document_id: str,
        user_id: str,
    ) -> dict[str, Any]:
        """Download, parse, and index a document."""
        doc = await self.get_document(document_id, user_id)
        if doc is None:
            raise FileNotFoundError(f"Document {document_id} not found")

        file_bytes = await download_file(path=doc["storage_path"])
        ext = doc["filename"].rsplit(".", 1)[-1].lower()

        parsers = {
            "pdf": parse_pdf,
            "docx": parse_docx,
            "csv": parse_csv,
            "xlsx": parse_xlsx,
        }
        parser = parsers.get(ext)
        if parser is None:
            raise ValueError(f"No parser available for .{ext} files")

        parsed = parser(file_bytes, filename=doc["filename"])

        # Update status
        async with async_session_factory() as session:
            await session.execute(
                __import__("sqlalchemy").text(
                    """
                    UPDATE documents
                    SET status = 'processing', updated_at = :now
                    WHERE id = :doc_id
                    """
                ),
                {"doc_id": document_id, "now": datetime.now(timezone.utc)},
            )
            await session.commit()

        # Kick off background embedding + indexing
        await process_document_async(
            document_id=document_id,
            text=parsed["text"],
            metadata=parsed.get("metadata", {}),
        )

        return {"document_id": document_id, "status": "processing"}

    async def trigger_indexing(self, document_id: str, user_id: str) -> dict[str, Any]:
        """Re-index an already-processed document."""
        return await self.process_document(document_id, user_id)
