from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncGenerator

from sqlalchemy import text

from backend.database import async_session_factory
from backend.prompts.templates import RAG_PROMPT, SYSTEM_PROMPT
from backend.rag.chunking import DocumentChunker
from backend.rag.context_builder import ContextBuilder
from backend.rag.embeddings import get_embeddings
from backend.rag.llm import get_llm
from backend.rag.retriever import RAGRetriever

logger = logging.getLogger(__name__)

CONTEXT_TOKEN_BUDGET = 4000


class RAGEngine:
    """End-to-end RAG orchestrator.

    Ingestion pipeline:
        parse → chunk → embed → store in pgvector

    Query pipeline:
        embed query → search pgvector (MMR) → build context → call LLM →
        format citations
    """

    def __init__(self) -> None:
        self._embeddings = get_embeddings()
        self._llm = get_llm()
        self._retriever = RAGRetriever()
        self._chunker = DocumentChunker(chunk_size=1000, overlap=200)
        self._context_builder = ContextBuilder(token_budget=CONTEXT_TOKEN_BUDGET)

    # ------------------------------------------------------------------
    # Ingestion
    # ------------------------------------------------------------------

    async def ingest_document(
        self,
        document_id: str,
        text_content: str,
        metadata: dict[str, Any] | None = None,
        user_id: str | None = None,
    ) -> int:
        """Chunk, embed, and store document content in pgvector.

        Returns the number of chunks stored.
        """
        base_meta = metadata or {}
        if user_id:
            base_meta["user_id"] = user_id
        base_meta["document_id"] = document_id

        chunks = self._chunker.chunk_text(text_content, metadata=base_meta)

        if not chunks:
            logger.warning("No chunks produced for document %s", document_id)
            return 0

        # Generate embeddings in batch
        texts = [c.text for c in chunks]
        embeddings = await self._embeddings.aembed_documents(texts)

        # Store in pgvector
        async with async_session_factory() as session:
            for chunk, embedding in zip(chunks, embeddings, strict=False):
                embedding_str = "[" + ",".join(str(v) for v in embedding) + "]"
                chunk_id = str(uuid.uuid4())

                chunk_meta = chunk.metadata.copy()
                chunk_meta["document_id"] = document_id
                chunk_meta["chunk_index"] = chunk.chunk_index

                await session.execute(
                    text("""
                        INSERT INTO document_chunks (
                            id, document_id, chunk_index, text, text_preview,
                            page_number, embedding, metadata, created_at
                        ) VALUES (
                            :id, :document_id, :chunk_index, :text, :text_preview,
                            :page_number, :embedding::vector, :metadata, :created_at
                        )
                    """),
                    {
                        "id": chunk_id,
                        "document_id": document_id,
                        "chunk_index": chunk.chunk_index,
                        "text": chunk.text,
                        "text_preview": chunk.text[:300],
                        "page_number": chunk_meta.get("page_number"),
                        "embedding": embedding_str,
                        "metadata": json.dumps(chunk_meta),
                        "created_at": datetime.now(timezone.utc),
                    },
                )

            # Update document status
            await session.execute(
                text("""
                    UPDATE documents
                    SET status = 'indexed', chunk_count = :count,
                        updated_at = :now
                    WHERE id = :doc_id
                """),
                {
                    "doc_id": document_id,
                    "count": len(chunks),
                    "now": datetime.now(timezone.utc),
                },
            )
            await session.commit()

        logger.info("Ingested document %s: %d chunks stored", document_id, len(chunks))
        return len(chunks)

    # ------------------------------------------------------------------
    # Query
    # ------------------------------------------------------------------

    async def query(
        self,
        query: str,
        chat_history: list[dict[str, str]] | None = None,
        user_id: str | None = None,
        document_id: str | None = None,
        k: int = 5,
    ) -> AsyncGenerator[str, None]:
        """RAG query that yields streaming tokens.

        1. Retrieve relevant chunks via MMR search.
        2. Build a budget-constrained context.
        3. Assemble the prompt with system instructions + chat history.
        4. Stream the LLM response.
        """
        # Retrieve
        chunks = await self._retriever.mmr_search(
            query,
            k=k,
            user_id=user_id,
            document_id=document_id,
        )

        # Deduplicate
        chunks = RAGRetriever.deduplicate_chunks(chunks)

        # Build context
        context = self._context_builder.build_prompt_context(
            chunks,
            query=query,
            include_citations=True,
        )

        # Format chat history
        history_text = self._format_chat_history(chat_history or [])

        # Build full prompt
        user_prompt = RAG_PROMPT.format(
            context=context,
            question=query,
            chat_history=history_text,
        )

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        # Stream LLM response
        async for token in self._llm.astream(messages):
            content = getattr(token, "content", None)
            if content:
                yield content

    # ------------------------------------------------------------------
    # Context + response with citations (non-streaming)
    # ------------------------------------------------------------------

    async def generate_response_with_citations(
        self,
        query: str,
        user_id: str | None = None,
        document_id: str | None = None,
        chat_history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        """Single-call RAG that returns the full response + citation metadata."""
        chunks = await self._retriever.mmr_search(
            query,
            k=5,
            user_id=user_id,
            document_id=document_id,
        )
        chunks = RAGRetriever.deduplicate_chunks(chunks)

        context = self._context_builder.build_prompt_context(
            chunks,
            query=query,
            include_citations=True,
        )
        history_text = self._format_chat_history(chat_history or [])

        user_prompt = RAG_PROMPT.format(
            context=context,
            question=query,
            chat_history=history_text,
        )

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ]

        response = await self._llm.ainvoke(messages)
        response_text = response.content if hasattr(response, "content") else str(response)

        # Build citations
        from backend.rag.citations import CitationGenerator

        cit_gen = CitationGenerator()
        citations = cit_gen.generate_citations(chunks, response_text)
        sources = self._context_builder.format_sources(chunks)

        return {
            "response": response_text,
            "citations": cit_gen.build_citation_block(citations),
            "sources": sources,
            "chunks_used": len(chunks),
        }

    # ------------------------------------------------------------------
    # Conversation memory
    # ------------------------------------------------------------------

    async def manage_conversation_memory(
        self,
        chat_id: str,
        max_messages: int = 20,
    ) -> list[dict[str, str]]:
        """Load and trim conversation history for a chat."""
        async with async_session_factory() as session:
            result = await session.execute(
                text("""
                    SELECT role, content
                    FROM messages
                    WHERE chat_id = :chat_id
                    ORDER BY created_at DESC
                    LIMIT :limit
                """),
                {"chat_id": chat_id, "limit": max_messages},
            )
            rows = result.mappings().all()

        # Reverse to chronological order
        history = [dict(r) for r in reversed(rows)]
        return history

    @staticmethod
    def _format_chat_history(
        history: list[dict[str, str]],
    ) -> str:
        """Format chat history into a readable block for prompts."""
        if not history:
            return "No previous conversation."

        lines: list[str] = []
        for msg in history[-10:]:  # keep last 10 messages
            role = msg.get("role", "user").capitalize()
            content = msg.get("content", "")[:500]
            lines.append(f"{role}: {content}")

        return "\n".join(lines)
