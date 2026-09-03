from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import text

from backend.database import async_session_factory
from backend.rag.embeddings import get_embeddings

logger = logging.getLogger(__name__)


class RAGRetriever:
    """Vector + hybrid search over pgvector document chunks."""

    def __init__(self) -> None:
        self._embeddings = get_embeddings()

    # ------------------------------------------------------------------
    # Core retrieval methods
    # ------------------------------------------------------------------

    async def semantic_search(
        self,
        query: str,
        k: int = 5,
        score_threshold: float = 0.0,
        user_id: str | None = None,
        document_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """Pure vector similarity search using pgvector cosine distance."""
        query_embedding = await self._embeddings.aembed_query(query)
        embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

        where_clauses: list[str] = []
        params: dict[str, Any] = {
            "embedding": embedding_str,
            "k": k,
            "threshold": score_threshold,
        }

        if user_id:
            where_clauses.append("d.user_id = :user_id")
            params["user_id"] = user_id
        if document_id:
            where_clauses.append("dc.document_id = :document_id")
            params["document_id"] = document_id

        where_sql = ""
        if where_clauses:
            where_sql = "AND " + " AND ".join(where_clauses)

        async with async_session_factory() as session:
            result = await session.execute(
                text(f"""
                    SELECT dc.id, dc.document_id, dc.chunk_index, dc.text,
                           dc.text_preview, dc.page_number, dc.metadata,
                           dc.embedding <=> :embedding AS distance,
                           1 - (dc.embedding <=> :embedding) AS similarity
                    FROM document_chunks dc
                    JOIN documents d ON d.id = dc.document_id
                    WHERE dc.embedding IS NOT NULL
                      AND (1 - (dc.embedding <=> :embedding)) >= :threshold
                      {where_sql}
                    ORDER BY dc.embedding <=> :embedding
                    LIMIT :k
                """),
                params,
            )
            rows = result.mappings().all()
            return [dict(r) for r in rows]

    async def hybrid_search(
        self,
        query: str,
        k: int = 5,
        bm25_weight: float = 0.3,
        vector_weight: float = 0.7,
        user_id: str | None = None,
        document_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """Combine BM25 full-text search with vector similarity."""
        # Get vector results
        vector_results = await self.semantic_search(
            query,
            k=k * 2,
            user_id=user_id,
            document_id=document_id,
        )

        # Get text search results using PostgreSQL full-text search
        search_terms = " | ".join(query.split())
        text_where = ""
        text_params: dict[str, Any] = {"query": search_terms, "k": k * 2}

        extra_where: list[str] = []
        if user_id:
            extra_where.append("d.user_id = :user_id")
            text_params["user_id"] = user_id
        if document_id:
            extra_where.append("dc.document_id = :document_id")
            text_params["document_id"] = document_id

        if extra_where:
            text_where = "AND " + " AND ".join(extra_where)

        async with async_session_factory() as session:
            result = await session.execute(
                text(f"""
                    SELECT dc.id, dc.document_id, dc.chunk_index, dc.text,
                           dc.text_preview, dc.page_number, dc.metadata,
                           ts_rank_cd(
                               to_tsvector('english', dc.text),
                               plainto_tsquery('english', :query)
                           ) AS text_score
                    FROM document_chunks dc
                    JOIN documents d ON d.id = dc.document_id
                    WHERE to_tsvector('english', dc.text)
                          @@ plainto_tsquery('english', :query)
                      {text_where}
                    ORDER BY text_score DESC
                    LIMIT :k
                """),
                text_params,
            )
            text_results = [dict(r) for r in result.mappings().all()]

        # Merge and rank
        scored: dict[str, dict[str, Any]] = {}
        max_text_score = max((r.get("text_score", 0) for r in text_results), default=1.0) or 1.0

        for rank, r in enumerate(vector_results):
            rid = r["id"]
            norm_vector = r.get("similarity", 0.5)
            scored[rid] = {**r, "_score": norm_vector * vector_weight}

        for rank, r in enumerate(text_results):
            rid = r["id"]
            norm_text = r.get("text_score", 0) / max_text_score
            if rid in scored:
                scored[rid]["_score"] += norm_text * bm25_weight
            else:
                scored[rid] = {**r, "_score": norm_text * bm25_weight}

        ranked = sorted(scored.values(), key=lambda x: x.get("_score", 0), reverse=True)

        for i, r in enumerate(ranked[:k]):
            r["retrieval_rank"] = i + 1

        return ranked[:k]

    async def mmr_search(
        self,
        query: str,
        k: int = 5,
        fetch_k: int = 20,
        lambda_mult: float = 0.5,
        user_id: str | None = None,
        document_id: str | None = None,
    ) -> list[dict[str, Any]]:
        """Maximal Marginal Relevance search for diversity."""
        candidates = await self.semantic_search(
            query,
            k=fetch_k,
            user_id=user_id,
            document_id=document_id,
        )

        if not candidates:
            return []

        if len(candidates) <= k:
            return candidates

        # Compute MMR scores
        query_embedding = await self._embeddings.aembed_query(query)
        query_norm = _norm(query_embedding)

        selected_indices: list[int] = [0]  # first result is always most similar
        selected_embeddings = [_parse_embedding(candidates[0])]

        for _ in range(1, k):
            best_score = -1.0
            best_idx = -1

            for i, candidate in enumerate(candidates):
                if i in selected_indices:
                    continue

                sim_to_query = candidates[i].get("similarity", 0.5)

                cand_emb = _parse_embedding(candidate)
                if cand_emb is None:
                    max_redundancy = 0.0
                else:
                    max_redundancy = (
                        max(_cosine_sim(cand_emb, sel_emb) for sel_emb in selected_embeddings if sel_emb is not None)
                        if selected_embeddings
                        else 0.0
                    )

                mmr_score = lambda_mult * sim_to_query - (1 - lambda_mult) * max_redundancy

                if mmr_score > best_score:
                    best_score = mmr_score
                    best_idx = i

            if best_idx == -1:
                break

            selected_indices.append(best_idx)
            selected_embeddings.append(_parse_embedding(candidates[best_idx]))

        results = [candidates[i] for i in selected_indices]
        for i, r in enumerate(results):
            r["retrieval_rank"] = i + 1
            r["mmr_score"] = r.get("similarity", 0.5)

        return results

    @staticmethod
    def deduplicate_chunks(
        chunks: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Remove duplicate chunks based on document_id + chunk_index."""
        seen: set[tuple[str, int]] = set()
        unique: list[dict[str, Any]] = []

        for chunk in chunks:
            key = (
                chunk.get("document_id", ""),
                chunk.get("chunk_index", -1),
            )
            if key in seen:
                continue
            seen.add(key)
            unique.append(chunk)

        return unique

    @staticmethod
    def rank_sources(
        chunks: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Assign a final retrieval rank to each chunk."""
        sorted_chunks = sorted(
            chunks,
            key=lambda c: c.get("similarity", c.get("_score", 0)),
            reverse=True,
        )
        for i, chunk in enumerate(sorted_chunks):
            chunk["retrieval_rank"] = i + 1
        return sorted_chunks


# ------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------


def _parse_embedding(chunk: dict[str, Any]) -> list[float] | None:
    """Try to extract an embedding vector from a chunk dict."""
    emb = chunk.get("embedding")
    if emb is None:
        return None
    if isinstance(emb, list):
        return emb
    if isinstance(emb, str):
        try:
            return [float(v) for v in emb.strip("[]").split(",")]
        except (ValueError, TypeError):
            return None
    return None


def _norm(vec: list[float]) -> float:
    return (sum(v * v for v in vec)) ** 0.5 or 1.0


def _cosine_sim(a: list[float], b: list[float]) -> float:
    if len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b, strict=False))
    return dot / (_norm(a) * _norm(b)) if (_norm(a) * _norm(b)) else 0.0
