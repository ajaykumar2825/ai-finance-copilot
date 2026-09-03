from __future__ import annotations

import hashlib
import uuid
from datetime import datetime, timezone
from typing import Any


class CitationGenerator:
    """Generate and format citations for RAG responses."""

    def generate_citations(
        self,
        chunks: list[dict[str, Any]],
        response_text: str,
    ) -> list[dict[str, Any]]:
        """Create citation entries for each source chunk used in a response.

        Each citation maps a source document to a reference number that can be
        rendered inline (e.g. [1], [2]).
        """
        citations: list[dict[str, Any]] = []
        seen: set[str] = set()

        for idx, chunk in enumerate(chunks, start=1):
            doc_id = chunk.get("document_id", "")
            text_preview = chunk.get("text_preview") or chunk.get("text", "")[:200]

            dedup_key = f"{doc_id}:{text_preview[:100]}"
            if dedup_key in seen:
                continue
            seen.add(dedup_key)

            citation_id = hashlib.md5(dedup_key.encode()).hexdigest()[:12]

            citations.append({
                "id": citation_id,
                "reference_number": idx,
                "document_id": doc_id,
                "filename": chunk.get("filename", "unknown"),
                "page_number": chunk.get("page_number"),
                "text_preview": text_preview,
                "relevance_score": chunk.get("relevance_score"),
                "chunk_index": chunk.get("chunk_index"),
            })

        return citations

    def format_citations(
        self,
        citations: list[dict[str, Any]],
        style: str = "inline",
    ) -> str:
        """Format citations into a human-readable string.

        Styles:
        * ``inline``  - ``[1] Source: filename (page 3)``
        * ``footnote`` - Numbered list at the end
        * ``academic`` - ``(Author, Year, p.X)`` style
        """
        if not citations:
            return ""

        lines: list[str] = []

        for c in citations:
            ref = c["reference_number"]
            filename = c.get("filename", "unknown")
            page = c.get("page_number")
            preview = c.get("text_preview", "")[:120]

            if style == "inline":
                page_str = f", p.{page}" if page else ""
                lines.append(f"[{ref}] {filename}{page_str}: {preview}")
            elif style == "footnote":
                page_str = f" (page {page})" if page else ""
                lines.append(
                    f"[{ref}] {filename}{page_str}. "
                    f"Available in uploaded document."
                )
            elif style == "academic":
                page_str = f", p.{page}" if page else ""
                lines.append(f"({filename}{page_str})")
            else:
                lines.append(f"[{ref}] {filename}")

        return "\n".join(lines)

    def extract_source_references(
        self,
        text: str,
    ) -> list[str]:
        """Extract inline reference markers like ``[1]`` from *text*."""
        import re

        pattern = r"\[(\d+)\]"
        matches = re.findall(pattern, text)
        return sorted(set(matches), key=int)

    def build_citation_block(
        self,
        citations: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """Build a structured citation block for API responses."""
        return {
            "total_sources": len(citations),
            "citations": [
                {
                    "ref": c["reference_number"],
                    "document_id": c["document_id"],
                    "filename": c.get("filename", ""),
                    "page": c.get("page_number"),
                    "preview": c.get("text_preview", "")[:200],
                    "score": c.get("relevance_score"),
                }
                for c in citations
            ],
        }
