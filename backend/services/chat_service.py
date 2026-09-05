from __future__ import annotations

import json
import logging
import uuid
from collections.abc import AsyncGenerator
from datetime import datetime, timezone
from typing import Any

from backend.database import async_session_factory
from backend.rag.engine import RAGEngine

logger = logging.getLogger(__name__)


class ChatService:
    """CRUD + AI streaming for chat conversations."""

    # ------------------------------------------------------------------
    # Chat CRUD
    # ------------------------------------------------------------------

    async def create_chat(
        self,
        user_id: str,
        title: str = "New Chat",
    ) -> dict[str, Any]:
        async with async_session_factory() as session:
            chat_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc)
            await session.execute(
                __import__("sqlalchemy").text(
                    """
                    INSERT INTO chats (id, user_id, title, created_at, updated_at)
                    VALUES (:id, :user_id, :title, :created_at, :updated_at)
                    """
                ),
                {
                    "id": chat_id,
                    "user_id": user_id,
                    "title": title,
                    "created_at": now,
                    "updated_at": now,
                },
            )
            await session.commit()
            return {
                "id": chat_id,
                "user_id": user_id,
                "title": title,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
            }

    async def list_chats(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        async with async_session_factory() as session:
            result = await session.execute(
                __import__("sqlalchemy").text(
                    """
                    SELECT id, user_id, title, created_at, updated_at
                    FROM chats
                    WHERE user_id = :user_id
                    ORDER BY updated_at DESC
                    LIMIT :limit OFFSET :offset
                    """
                ),
                {"user_id": user_id, "limit": limit, "offset": offset},
            )
            rows = result.mappings().all()
            return [dict(r) for r in rows]

    async def get_chat(self, chat_id: str, user_id: str) -> dict[str, Any] | None:
        async with async_session_factory() as session:
            result = await session.execute(
                __import__("sqlalchemy").text(
                    """
                    SELECT id, user_id, title, created_at, updated_at
                    FROM chats
                    WHERE id = :chat_id AND user_id = :user_id
                    """
                ),
                {"chat_id": chat_id, "user_id": user_id},
            )
            row = result.mappings().first()
            return dict(row) if row else None

    async def update_chat(
        self,
        chat_id: str,
        user_id: str,
        title: str | None = None,
    ) -> dict[str, Any] | None:
        async with async_session_factory() as session:
            now = datetime.now(timezone.utc)
            updates: list[str] = ["updated_at = :now"]
            params: dict[str, Any] = {"chat_id": chat_id, "user_id": user_id, "now": now}

            if title is not None:
                updates.append("title = :title")
                params["title"] = title

            await session.execute(
                __import__("sqlalchemy").text(
                    f"""
                    UPDATE chats
                    SET {", ".join(updates)}
                    WHERE id = :chat_id AND user_id = :user_id
                    """
                ),
                params,
            )
            await session.commit()
            return await self.get_chat(chat_id, user_id)

    async def delete_chat(self, chat_id: str, user_id: str) -> bool:
        async with async_session_factory() as session:
            await session.execute(
                __import__("sqlalchemy").text(
                    """
                    DELETE FROM messages WHERE chat_id = :chat_id
                    """
                ),
                {"chat_id": chat_id},
            )
            result = await session.execute(
                __import__("sqlalchemy").text(
                    """
                    DELETE FROM chats
                    WHERE id = :chat_id AND user_id = :user_id
                    """
                ),
                {"chat_id": chat_id, "user_id": user_id},
            )
            await session.commit()
            return result.rowcount > 0

    # ------------------------------------------------------------------
    # Messages
    # ------------------------------------------------------------------

    async def get_messages(
        self,
        chat_id: str,
        user_id: str,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        async with async_session_factory() as session:
            result = await session.execute(
                __import__("sqlalchemy").text(
                    """
                    SELECT m.id, m.chat_id, m.role, m.content, m.created_at,
                           m.metadata
                    FROM messages m
                    JOIN chats c ON c.id = m.chat_id
                    WHERE m.chat_id = :chat_id AND c.user_id = :user_id
                    ORDER BY m.created_at ASC
                    LIMIT :limit
                    """
                ),
                {"chat_id": chat_id, "user_id": user_id, "limit": limit},
            )
            rows = result.mappings().all()
            messages: list[dict[str, Any]] = []
            for row in rows:
                msg = dict(row)
                if msg.get("metadata") and isinstance(msg["metadata"], str):
                    msg["metadata"] = json.loads(msg["metadata"])
                messages.append(msg)
            return messages

    async def add_message(
        self,
        chat_id: str,
        role: str,
        content: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        async with async_session_factory() as session:
            msg_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc)
            meta_json = json.dumps(metadata) if metadata else None

            await session.execute(
                __import__("sqlalchemy").text(
                    """
                    INSERT INTO messages (id, chat_id, role, content, created_at,
                                          metadata)
                    VALUES (:id, :chat_id, :role, :content, :created_at, :metadata)
                    """
                ),
                {
                    "id": msg_id,
                    "chat_id": chat_id,
                    "role": role,
                    "content": content,
                    "created_at": now,
                    "metadata": meta_json,
                },
            )
            await session.execute(
                __import__("sqlalchemy").text(
                    """
                    UPDATE chats SET updated_at = :now WHERE id = :chat_id
                    """
                ),
                {"chat_id": chat_id, "now": now},
            )
            await session.commit()

            return {
                "id": msg_id,
                "chat_id": chat_id,
                "role": role,
                "content": content,
                "created_at": now.isoformat(),
                "metadata": metadata,
            }

    # ------------------------------------------------------------------
    # AI response streaming
    # ------------------------------------------------------------------

    async def stream_ai_response(
        self,
        chat_id: str,
        user_id: str,
        user_message: str,
    ) -> AsyncGenerator[str, None]:
        """Yield SSE-formatted chunks from the RAG engine.

        Each chunk is an ``event: data`` line containing JSON:
        ``{"type": "chunk"|"done"|"error", "content": "..."}``
        """
        # Persist user message
        await self.add_message(chat_id, role="user", content=user_message)

        # Load chat history for context
        history = await self.get_messages(chat_id, user_id, limit=20)
        chat_history = [
            {"role": m["role"], "content": m["content"]}
            for m in history[:-1]  # exclude the just-added user message
        ]

        engine = RAGEngine()
        full_response = ""

        try:
            async for token in engine.query(
                query=user_message,
                chat_history=chat_history,
            ):
                full_response += token
                yield f"data: {json.dumps({'type': 'chunk', 'content': token})}\n\n"

            # Persist assistant response
            await self.add_message(
                chat_id,
                role="assistant",
                content=full_response,
            )
        except Exception as exc:
            logger.exception("AI response generation failed")
            yield f"data: {json.dumps({'type': 'error', 'content': str(exc)})}\n\n"

        yield f"data: {json.dumps({'type': 'done', 'content': ''})}\n\n"
