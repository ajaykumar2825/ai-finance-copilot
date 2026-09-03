from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class TextChunk:
    """A single chunk of text with positional metadata."""

    text: str
    chunk_index: int
    start_char: int
    end_char: int
    metadata: dict[str, Any] = field(default_factory=dict)


class DocumentChunker:
    """Recursive-character text splitter with metadata preservation.

    Args:
        chunk_size: Maximum character count per chunk (default 1000).
        overlap: Number of overlapping characters between consecutive chunks
                 (default 200).
    """

    def __init__(
        self,
        chunk_size: int = 1000,
        overlap: int = 200,
    ) -> None:
        if chunk_size <= 0:
            raise ValueError("chunk_size must be > 0")
        if overlap < 0:
            raise ValueError("overlap must be >= 0")
        if overlap >= chunk_size:
            raise ValueError("overlap must be < chunk_size")

        self.chunk_size = chunk_size
        self.overlap = overlap
        self._separators = [
            "\n\n",
            "\n",
            ". ",
            "! ",
            "? ",
            "; ",
            ", ",
            " ",
            "",
        ]

    def chunk_text(
        self,
        text: str,
        metadata: dict[str, Any] | None = None,
    ) -> list[TextChunk]:
        """Split *text* into overlapping chunks, preserving metadata."""
        base_meta = metadata or {}

        if not text or not text.strip():
            return []

        # Normalise whitespace but preserve structure
        text = self._normalise_text(text)

        raw_chunks = self._recursive_split(text, self._separators)

        # Merge short fragments to avoid tiny chunks
        merged = self._merge_small_chunks(raw_chunks)

        # Apply overlap
        overlapped = self._apply_overlap(merged)

        # Build final chunk objects with metadata
        chunks: list[TextChunk] = []
        char_offset = 0
        for idx, chunk_text in enumerate(overlapped):
            # Compute character offsets by searching in original text
            start = text.find(chunk_text[:80], char_offset)
            if start == -1:
                start = char_offset
            end = min(start + len(chunk_text), len(text))

            chunk_meta = {
                **base_meta,
                "chunk_index": idx,
                "start_char": start,
                "end_char": end,
            }

            chunks.append(TextChunk(
                text=chunk_text.strip(),
                chunk_index=idx,
                start_char=start,
                end_char=end,
                metadata=chunk_meta,
            ))
            char_offset = max(start, end - self.overlap)

        logger.debug(
            "Chunked %d chars into %d chunks (size=%d, overlap=%d)",
            len(text), len(chunks), self.chunk_size, self.overlap,
        )
        return chunks

    # ------------------------------------------------------------------
    # Internal splitting logic
    # ------------------------------------------------------------------

    def _recursive_split(
        self,
        text: str,
        separators: list[str],
    ) -> list[str]:
        """Recursively split text using a hierarchy of separators."""
        if len(text) <= self.chunk_size:
            return [text] if text.strip() else []

        sep = separators[0] if separators else ""
        remaining_separators = separators[1:] if len(separators) > 1 else [""]

        if sep == "":
            # Character-level split as last resort
            return [
                text[i : i + self.chunk_size]
                for i in range(0, len(text), self.chunk_size)
            ]

        parts = text.split(sep)
        chunks: list[str] = []
        current = ""

        for part in parts:
            candidate = (current + sep + part) if current else part
            if len(candidate) <= self.chunk_size:
                current = candidate
            else:
                if current:
                    chunks.append(current)
                # If a single part exceeds chunk_size, recurse
                if len(part) > self.chunk_size:
                    sub_chunks = self._recursive_split(
                        part, remaining_separators
                    )
                    chunks.extend(sub_chunks)
                    current = ""
                else:
                    current = part

        if current.strip():
            chunks.append(current)

        return chunks

    def _merge_small_chunks(self, chunks: list[str]) -> list[str]:
        """Merge chunks that are smaller than 20% of chunk_size."""
        if not chunks:
            return []

        min_size = self.chunk_size * 0.2
        merged: list[str] = []
        buffer = ""

        for chunk in chunks:
            if buffer and len(buffer) + len(chunk) + 1 <= self.chunk_size:
                buffer = buffer + " " + chunk
            elif buffer:
                merged.append(buffer)
                buffer = chunk if len(chunk) < min_size else ""
                if not buffer:
                    merged.append(chunk)
            else:
                if len(chunk) < min_size:
                    buffer = chunk
                else:
                    merged.append(chunk)

        if buffer.strip():
            merged.append(buffer)

        return merged

    def _apply_overlap(self, chunks: list[str]) -> list[str]:
        """Add character overlap between consecutive chunks."""
        if self.overlap <= 0 or len(chunks) <= 1:
            return chunks

        overlapped: list[str] = [chunks[0]]
        for i in range(1, len(chunks)):
            prev = chunks[i - 1]
            overlap_text = prev[-self.overlap :]
            overlapped.append(overlap_text + chunks[i])

        return overlapped

    @staticmethod
    def _normalise_text(text: str) -> str:
        """Collapse excessive whitespace while preserving paragraph breaks."""
        text = re.sub(r"[^\S\n]+", " ", text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()
