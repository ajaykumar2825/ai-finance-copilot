from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from backend.database import async_session_factory

logger = logging.getLogger(__name__)

NEWS_API_KEY_FALLBACK = ""


class NewsService:
    """Fetch, store, and analyze financial news."""

    async def fetch_news(
        self,
        query: str = "finance markets",
        limit: int = 20,
        language: str = "en",
    ) -> list[dict[str, Any]]:
        """Fetch articles from an external news API and persist them.

        Uses ``newsapi.org`` if ``NEWS_API_KEY`` is set; otherwise falls back
        to a best-effort RSS approach via ``yfinance``.
        """
        articles = await self._fetch_from_yfinance(query, limit)

        async with async_session_factory() as session:
            for article in articles:
                await session.execute(
                    __import__("sqlalchemy").text(
                        """
                        INSERT INTO news (
                            id, title, description, source, url, published_at,
                            query, created_at
                        ) VALUES (
                            :id, :title, :description, :source, :url,
                            :published_at, :query, :created_at
                        )
                        ON CONFLICT (url) DO NOTHING
                        """
                    ),
                    {
                        "id": article["id"],
                        "title": article["title"],
                        "description": article.get("description", ""),
                        "source": article.get("source", ""),
                        "url": article["url"],
                        "published_at": article.get("published_at"),
                        "query": query,
                        "created_at": datetime.now(timezone.utc),
                    },
                )
            await session.commit()

        return articles

    async def get_news(
        self,
        limit: int = 20,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        async with async_session_factory() as session:
            result = await session.execute(
                __import__("sqlalchemy").text(
                    """
                    SELECT id, title, description, source, url, published_at,
                           query, sentiment, created_at
                    FROM news
                    ORDER BY published_at DESC NULLS LAST, created_at DESC
                    LIMIT :limit OFFSET :offset
                    """
                ),
                {"limit": limit, "offset": offset},
            )
            return [dict(r) for r in result.mappings().all()]

    async def get_company_news(
        self,
        ticker: str,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        """Retrieve news relevant to a specific ticker."""
        # Fetch fresh articles
        await self.fetch_news(query=f"{ticker} stock", limit=limit)

        async with async_session_factory() as session:
            result = await session.execute(
                __import__("sqlalchemy").text(
                    """
                    SELECT id, title, description, source, url, published_at,
                           sentiment, created_at
                    FROM news
                    WHERE query ILIKE :pattern
                    ORDER BY published_at DESC NULLS LAST
                    LIMIT :limit
                    """
                ),
                {"pattern": f"%{ticker}%", "limit": limit},
            )
            return [dict(r) for r in result.mappings().all()]

    async def analyze_sentiment(
        self,
        text: str,
    ) -> dict[str, Any]:
        """Simple keyword-based sentiment analysis.

        Returns a dict with ``label`` (positive / negative / neutral) and a
        ``score`` between -1.0 (very negative) and +1.0 (very positive).
        """
        positive_words = {
            "gain", "gains", "gainful", "bullish", "profit", "profits",
            "growth", "growing", "surge", "surges", "rally", "rallies",
            "rise", "rises", "rising", "high", "higher", "up", "boom",
            "outperform", "beat", "beats", "upgrade", "strong", "positive",
            "optimistic", "record", "milestone", "recovery",
        }
        negative_words = {
            "loss", "losses", "bearish", "decline", "declines", "drop",
            "drops", "fall", "falls", "falling", "crash", "crashes", "low",
            "lower", "down", "plunge", "plunges", "slump", "slumps",
            "underperform", "miss", "misses", "downgrade", "weak",
            "negative", "pessimistic", "recession", "debt", "bankruptcy",
            "default", "sell-off",
        }

        tokens = text.lower().split()
        pos = sum(1 for t in tokens if t.strip(".,!?;:") in positive_words)
        neg = sum(1 for t in tokens if t.strip(".,!?;:") in negative_words)

        if pos == 0 and neg == 0:
            label, score = "neutral", 0.0
        else:
            total = pos + neg
            score = (pos - neg) / total
            if score > 0.1:
                label = "positive"
            elif score < -0.1:
                label = "negative"
            else:
                label = "neutral"

        return {"label": label, "score": round(score, 3)}

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    async def _fetch_from_yfinance(
        self, query: str, limit: int
    ) -> list[dict[str, Any]]:
        import yfinance as yf
        import uuid

        try:
            data = yf.Search(query, max_results=limit)
            news_items = getattr(data, "news", []) or []
        except Exception as exc:
            logger.warning("yfinance news search failed: %s", exc)
            return []

        articles: list[dict[str, Any]] = []
        for item in news_items:
            url = item.get("link", "")
            if not url:
                continue
            articles.append({
                "id": str(uuid.uuid4()),
                "title": item.get("title", ""),
                "description": item.get("summary", ""),
                "source": item.get("publisher", ""),
                "url": url,
                "published_at": item.get("providerPublishTime"),
            })
            if len(articles) >= limit:
                break

        return articles
