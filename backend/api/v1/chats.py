from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_async_session
from backend.dependencies import get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class ChatCreateRequest(BaseModel):
    title: str = Field(default="New Chat", min_length=1, max_length=500)


class ChatUpdateRequest(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    is_pinned: bool | None = None


class ChatResponse(BaseModel):
    id: str
    title: str
    is_pinned: bool = False
    created_at: str
    updated_at: str


class ChatListResponse(BaseModel):
    chats: list[ChatResponse]
    total: int


class MessageResponse(BaseModel):
    id: str
    chat_id: str
    role: str
    content: str
    citations: list[dict] = []
    created_at: str


class MessageListResponse(BaseModel):
    messages: list[MessageResponse]


class SendMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=50000)


class SendMessageResponse(BaseModel):
    user_message: MessageResponse
    ai_message: MessageResponse


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "",
    response_model=ChatListResponse,
    summary="List all chats for the current user",
)
async def list_chats(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> ChatListResponse:
    """Return a paginated list of the current user's chats, newest first."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    result = await db.execute(
        text(
            """
            SELECT id, title, is_pinned, created_at, updated_at
            FROM chats
            WHERE user_id = :uid
            ORDER BY is_pinned DESC, updated_at DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        {"uid": user_id, "limit": limit, "offset": offset},
    )
    rows = result.fetchall()

    count_result = await db.execute(
        text("SELECT COUNT(*) FROM chats WHERE user_id = :uid"),
        {"uid": user_id},
    )
    total = count_result.scalar() or 0

    chats = [
        ChatResponse(
            id=str(row.id),
            title=row.title,
            is_pinned=row.is_pinned,
            created_at=row.created_at.isoformat() if row.created_at else "",
            updated_at=row.updated_at.isoformat() if row.updated_at else "",
        )
        for row in rows
    ]

    return ChatListResponse(chats=chats, total=total)


@router.post(
    "",
    response_model=ChatResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new chat",
)
async def create_chat(
    body: ChatCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> ChatResponse:
    """Create a new chat session for the current user."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")
    chat_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    await db.execute(
        text(
            """
            INSERT INTO chats (id, user_id, title, is_pinned, created_at, updated_at)
            VALUES (:id, :uid, :title, false, :now, :now)
            """
        ),
        {"id": chat_id, "uid": user_id, "title": body.title, "now": now},
    )

    return ChatResponse(
        id=chat_id,
        title=body.title,
        is_pinned=False,
        created_at=now.isoformat(),
        updated_at=now.isoformat(),
    )


@router.get(
    "/{chat_id}",
    response_model=ChatResponse,
    summary="Get a single chat by ID",
)
async def get_chat(
    chat_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> ChatResponse:
    """Fetch details of a specific chat owned by the current user."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    result = await db.execute(
        text(
            """
            SELECT id, title, is_pinned, created_at, updated_at
            FROM chats
            WHERE id = :cid AND user_id = :uid
            """
        ),
        {"cid": chat_id, "uid": user_id},
    )
    row = result.fetchone()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found",
        )

    return ChatResponse(
        id=str(row.id),
        title=row.title,
        is_pinned=row.is_pinned,
        created_at=row.created_at.isoformat() if row.created_at else "",
        updated_at=row.updated_at.isoformat() if row.updated_at else "",
    )


@router.put(
    "/{chat_id}",
    response_model=ChatResponse,
    summary="Update a chat's title or pin status",
)
async def update_chat(
    chat_id: str,
    body: ChatUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> ChatResponse:
    """Update the title or pin status of a chat."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    # Verify ownership
    check = await db.execute(
        text("SELECT id FROM chats WHERE id = :cid AND user_id = :uid"),
        {"cid": chat_id, "uid": user_id},
    )
    if check.fetchone() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found",
        )

    updates: list[str] = ["updated_at = NOW()"]
    params: dict = {"cid": chat_id}

    if body.title is not None:
        updates.append("title = :title")
        params["title"] = body.title
    if body.is_pinned is not None:
        updates.append("is_pinned = :pinned")
        params["pinned"] = body.is_pinned

    set_clause = ", ".join(updates)
    await db.execute(
        text(f"UPDATE chats SET {set_clause} WHERE id = :cid"),
        params,
    )

    result = await db.execute(
        text(
            "SELECT id, title, is_pinned, created_at, updated_at FROM chats WHERE id = :cid"
        ),
        {"cid": chat_id},
    )
    row = result.fetchone()

    return ChatResponse(
        id=str(row.id),
        title=row.title,
        is_pinned=row.is_pinned,
        created_at=row.created_at.isoformat() if row.created_at else "",
        updated_at=row.updated_at.isoformat() if row.updated_at else "",
    )


@router.delete(
    "/{chat_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a chat and all its messages",
)
async def delete_chat(
    chat_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> None:
    """Permanently delete a chat and all associated messages."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    # Verify ownership
    check = await db.execute(
        text("SELECT id FROM chats WHERE id = :cid AND user_id = :uid"),
        {"cid": chat_id, "uid": user_id},
    )
    if check.fetchone() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found",
        )

    await db.execute(
        text("DELETE FROM messages WHERE chat_id = :cid"),
        {"cid": chat_id},
    )
    await db.execute(
        text("DELETE FROM chats WHERE id = :cid AND user_id = :uid"),
        {"cid": chat_id, "uid": user_id},
    )


@router.get(
    "/{chat_id}/messages",
    response_model=MessageListResponse,
    summary="Get all messages in a chat",
)
async def list_messages(
    chat_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
) -> MessageListResponse:
    """Return the message history for a chat, in chronological order."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    # Verify chat ownership
    check = await db.execute(
        text("SELECT id FROM chats WHERE id = :cid AND user_id = :uid"),
        {"cid": chat_id, "uid": user_id},
    )
    if check.fetchone() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found",
        )

    result = await db.execute(
        text(
            """
            SELECT id, chat_id, role, content, citations, created_at
            FROM messages
            WHERE chat_id = :cid
            ORDER BY created_at ASC
            LIMIT :limit OFFSET :offset
            """
        ),
        {"cid": chat_id, "limit": limit, "offset": offset},
    )
    rows = result.fetchall()

    messages = [
        MessageResponse(
            id=str(row.id),
            chat_id=str(row.chat_id),
            role=row.role,
            content=row.content,
            citations=row.citations if isinstance(row.citations, list) else [],
            created_at=row.created_at.isoformat() if row.created_at else "",
        )
        for row in rows
    ]

    return MessageListResponse(messages=messages)


@router.post(
    "/{chat_id}/messages",
    status_code=status.HTTP_200_OK,
    summary="Send a message and stream the AI response",
)
async def send_message(
    chat_id: str,
    body: SendMessageRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
):
    """Send a user message, store it, invoke the RAG engine, and stream the AI
    response back as Server-Sent Events (SSE).

    Each SSE ``data`` payload is a JSON object with a ``type`` field:

    * ``token`` – a single token of the streamed response.
    * ``citations`` – the list of source citations when the response is complete.
    * ``done`` – signals the end of the stream.
    """
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    # ---- verify chat ownership ----
    check = await db.execute(
        text("SELECT id, title FROM chats WHERE id = :cid AND user_id = :uid"),
        {"cid": chat_id, "uid": user_id},
    )
    chat_row = check.fetchone()
    if chat_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found",
        )

    # ---- persist the user message ----
    user_msg_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    await db.execute(
        text(
            """
            INSERT INTO messages (id, chat_id, role, content, citations, created_at)
            VALUES (:id, :cid, 'user', :content, '[]'::jsonb, :now)
            """
        ),
        {"id": user_msg_id, "cid": chat_id, "content": body.content, "now": now},
    )

    # ---- build conversation history for context ----
    history_result = await db.execute(
        text(
            """
            SELECT role, content FROM messages
            WHERE chat_id = :cid
            ORDER BY created_at ASC
            """
        ),
        {"cid": chat_id},
    )
    history_rows = history_result.fetchall()
    conversation_history = [
        {"role": row.role, "content": row.content} for row in history_rows
    ]

    # ---- stream the AI response via SSE ----
    async def event_generator():
        from backend.services.rag_engine import get_rag_response  # type: ignore[import-untyped]

        full_response = ""
        citations: list[dict] = []

        try:
            async for chunk in get_rag_response(
                user_message=body.content,
                conversation_history=conversation_history,
                user_id=user_id,
            ):
                if isinstance(chunk, dict) and "citations" in chunk:
                    citations = chunk["citations"]
                else:
                    token = str(chunk)
                    full_response += token
                    yield f"data: {json.dumps({'type': 'token', 'token': token})}\n\n"

        except Exception as exc:
            error_msg = f"AI service error: {exc}"
            yield f"data: {json.dumps({'type': 'error', 'message': error_msg})}\n\n"

        # ---- persist the AI message ----
        ai_msg_id = str(uuid.uuid4())
        ai_now = datetime.now(timezone.utc)

        async with db.begin_nested():
            await db.execute(
                text(
                    """
                    INSERT INTO messages (id, chat_id, role, content, citations, created_at)
                    VALUES (:id, :cid, 'assistant', :content, :citations::jsonb, :now)
                    """
                ),
                {
                    "id": ai_msg_id,
                    "cid": chat_id,
                    "content": full_response,
                    "citations": json.dumps(citations),
                    "now": ai_now,
                },
            )

            # Update chat timestamp
            await db.execute(
                text("UPDATE chats SET updated_at = :now WHERE id = :cid"),
                {"now": ai_now, "cid": chat_id},
            )

        # Send citations and done signal
        yield f"data: {json.dumps({'type': 'citations', 'citations': citations})}\n\n"
        yield f"data: {json.dumps({'type': 'done', 'message_id': ai_msg_id})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
