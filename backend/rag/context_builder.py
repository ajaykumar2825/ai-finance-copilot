from __future__ import annotations

import logging
from typing import Any

from backend.rag.citations import CitationGenerator

logger = logging.getLogger(__name__)

DEFAULT_TOKEN_BUDGET = 4000
CHARS_PER_TOKEN = 4


class ContextBuilder:
    """Assemble the final context string that gets injected into prompts.

    Handles truncation, source formatting, and token-budget enforcement.
    """

    def __init__(self, token_budget: int = DEFAULT_TOKEN_BUDGET) -> None:
        self.token_budget = token_budget
        self.citation_gen = CitationGenerator()

    def build_prompt_context(
        self,
        chunks: list[dict[str, Any]],
        query: str = "",
        include_citations: bool = True,
    ) -> str:
        """Build a context string from retrieved chunks.

        The output is intended to be injected as ``{context}`` in a prompt
        template.
        """
        if not chunks:
            return "No relevant context found."

        context_parts: list[str] = []
        used_tokens = 0
        budget_chars = self.token_budget * CHARS_PER_TOKEN

        for chunk in chunks:
            text = chunk.get("text", "").strip()
            if not text:
                continue

            # Reserve space for citation marker
            marker_overhead = 20  # e.g. " [Source 1]"
            available_chars = budget_chars - used_tokens - marker_overhead

            if available_chars <= 0:
                break

            truncated = self._truncate_chunk(text, available_chars)

            source_label = ""
            if include_citations:
                ref = chunk.get("retrieval_rank", chunk.get("chunk_index", "?"))
                source_label = f" [Source {ref}]"

            context_parts.append(f"{truncated}{source_label}")
            used_tokens += len(truncated) // CHARS_PER_TOKEN + marker_overhead // CHARS_PER_TOKEN

        if not context_parts:
            return "No relevant context found."

        return "\n\n---\n\n".join(context_parts)

    def truncate_to_budget(
        self,
        text: str,
        max_tokens: int | None = None,
    ) -> str:
        """Truncate *text* to fit within the token budget."""
        budget = max_tokens or self.token_budget
        max_chars = budget * CHARS_PER_TOKEN

        if len(text) <= max_chars:
            return text

        truncated = text[:max_chars]
        # Try to cut at the last sentence boundary
        last_period = truncated.rfind(". ")
        last_newline = truncated.rfind("\n")
        cut_point = max(last_period, last_newline)

        if cut_point > max_chars * 0.5:
            return truncated[: cut_point + 1] + "…"

        return truncated.rstrip() + "…"

    def format_sources(
        self,
        chunks: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Return a deduplicated list of source metadata for API consumers."""
        seen: set[str] = set()
        sources: list[dict[str, Any]] = []

        for chunk in chunks:
            doc_id = chunk.get("document_id", "")
            if doc_id in seen:
                continue
            seen.add(doc_id)

            sources.append(
                {
                    "document_id": doc_id,
                    "filename": chunk.get("filename", "unknown"),
                    "page_number": chunk.get("page_number"),
                    "relevance_score": chunk.get("relevance_score"),
                    "text_preview": (chunk.get("text", "")[:200]),
                }
            )

        return sources

    def estimate_tokens(self, text: str) -> int:
        """Rough token estimate using character count."""
        return len(text) // CHARS_PER_TOKEN

    @staticmethod
    def _truncate_chunk(text: str, max_chars: int) -> str:
        """Truncate a single chunk, preferring sentence boundaries."""
        if len(text) <= max_chars:
            return text

        truncated = text[:max_chars]
        last_period = truncated.rfind(". ")
        if last_period > max_chars * 0.5:
            return truncated[: last_period + 1]
        return truncated.rstrip() + "…"
