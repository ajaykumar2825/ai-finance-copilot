from __future__ import annotations

import asyncio
import logging
from typing import Any

from backend.rag.engine import RAGEngine
from backend.utils.text import clean_text

logger = logging.getLogger(__name__)


async def process_document_async(
    document_id: str,
    text: str,
    metadata: dict[str, Any] | None = None,
    user_id: str | None = None,
) -> None:
    """Background task for full document processing.

    Pipeline:
        parse (already done by caller) → clean → chunk → embed → store in pgvector.

    This function runs in an async task without blocking the request that
    triggered it.
    """
    if not text or not text.strip():
        logger.warning("Document %s has no extractable text", document_id)
        return

    cleaned = clean_text(text, collapse_whitespace=True)

    engine = RAGEngine()
    try:
        chunk_count = await engine.ingest_document(
            document_id=document_id,
            text_content=cleaned,
            metadata=metadata,
            user_id=user_id,
        )
        logger.info(
            "Document worker finished: %s (%d chunks)", document_id, chunk_count
        )
    except Exception as exc:
        logger.exception(
            "Document worker failed to process %s: %s", document_id, exc
        )


def schedule_document_processing(
    document_id: str,
    text: str,
    metadata: dict[str, Any] | None = None,
    user_id: str | None = None,
) -> asyncio.Task[None]:
    """Schedule document processing as a fire-and-forget asyncio task."""
    task = asyncio.create_task(
        process_document_async(
            document_id=document_id,
            text=text,
            metadata=metadata,
            user_id=user_id,
        )
    )
    task.add_done_callback(_log_task_result)
    return task


def _log_task_result(task: asyncio.Task[None]) -> None:
    try:
        task.result()
    except asyncio.CancelledError:
        logger.info("Document processing task cancelled")
    except Exception as exc:
        logger.exception("Document processing task raised: %s", exc)