from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Query
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()


# ---------------------------------------------------------------------------
# Response schemas (match the frontend contract exactly)
# ---------------------------------------------------------------------------


class NewsArticle(BaseModel):
    id: str
    ticker: str | None = None
    title: str
    summary: str | None = None
    sentiment: str = "neutral"
    source: str | None = None
    url: str
    publishedAt: str | None = None


class NewsListResponse(BaseModel):
    items: list[NewsArticle]
    total: int
    page: int
    pageSize: int


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _classify_sentiment(title: str) -> str:
    """Simple keyword-based sentiment classifier."""
    title_lower = title.lower()

    positive_words = {
        "surge",
        "soar",
        "rally",
        "gain",
        "jump",
        "rise",
        "record",
        "high",
        "beat",
        "outperform",
        "upgrade",
        "bull",
        "boom",
        "profit",
        "growth",
        "strong",
        "positive",
        "buy",
        "best",
    }
    negative_words = {
        "crash",
        "plunge",
        "drop",
        "fall",
        "decline",
        "loss",
        "slump",
        "low",
        "miss",
        "underperform",
        "downgrade",
        "bear",
        "bust",
        "recession",
        "weak",
        "negative",
        "sell",
        "worst",
        "warn",
        "risk",
        "debt",
    }

    pos_count = sum(1 for w in positive_words if w in title_lower)
    neg_count = sum(1 for w in negative_words if w in title_lower)

    if pos_count > neg_count:
        return "positive"
    if neg_count > pos_count:
        return "negative"
    return "neutral"


def _from_yfinance_news(news_items: list, ticker: str | None) -> list[dict]:
    articles: list[dict] = []
    for item in news_items:
        content = item.get("content", {}) if isinstance(item.get("content"), dict) else {}
        url = item.get("link") or content.get("canonicalUrl", {}).get("url") or ""
        if not url:
            continue
        pub_date = content.get("pubDate")
        articles.append(
            {
                "title": item.get("title", ""),
                "url": url,
                "source": item.get("publisher", "") or content.get("provider", {}).get("displayName", ""),
                "published_at": str(pub_date) if pub_date else None,
                "summary": content.get("summary", ""),
                "related_tickers": [ticker.upper()] if ticker else [],
            }
        )
    return articles


async def _fetch_news(ticker: str | None = None, limit: int = 20) -> list[dict]:
    """Fetch news via yfinance. Returns an empty list on any failure (never crashes)."""
    try:
        import yfinance as yf  # type: ignore[import-untyped]
    except Exception as exc:
        logger.warning("yfinance unavailable; returning empty news list: %s", exc)
        return []

    try:
        if ticker:
            stock = yf.Ticker(ticker.upper())
            news_items = getattr(stock, "news", None) or []
            return _from_yfinance_news(list(news_items)[:limit], ticker)
        search = yf.Search("stock market", max_results=limit)
        news_items = getattr(search, "news", []) or []
        return _from_yfinance_news(list(news_items)[:limit], None)
    except Exception as exc:
        logger.warning("yfinance news fetch failed; returning empty news list: %s", exc)
        return []


def _to_article(raw: dict, ticker: str | None = None) -> NewsArticle:
    return NewsArticle(
        id=str(uuid.uuid4()),
        ticker=ticker or (raw.get("related_tickers") or [None])[0],
        title=raw.get("title", ""),
        summary=raw.get("summary"),
        sentiment=_classify_sentiment(raw.get("title", "")),
        source=raw.get("source"),
        url=raw.get("url", ""),
        publishedAt=raw.get("published_at"),
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=NewsListResponse, summary="Get financial news with optional filters")
async def list_news(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    ticker: str | None = Query(default=None),
    sentiment: str | None = Query(default=None, pattern=r"^(positive|negative|neutral)$"),
) -> NewsListResponse:
    """Return financial news articles as a paginated list (frontend contract).

    If the external news source is unavailable the endpoint returns an empty
    list rather than crashing.
    """
    raw = await _fetch_news(ticker=ticker.upper() if ticker else None, limit=page_size)

    articles: list[NewsArticle] = []
    for r in raw:
        sent = _classify_sentiment(r.get("title", ""))
        if sentiment and sent != sentiment:
            continue
        articles.append(_to_article(r, ticker))

    return NewsListResponse(items=articles[:page_size], total=len(articles), page=page, pageSize=page_size)


@router.get("/company/{ticker}", response_model=NewsListResponse, summary="Get news for a specific company")
async def company_news(
    ticker: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> NewsListResponse:
    """Return recent news articles related to a specific company ticker."""
    raw = await _fetch_news(ticker=ticker.upper(), limit=page_size)
    articles = [_to_article(r, ticker) for r in raw]
    return NewsListResponse(items=articles[:page_size], total=len(articles), page=page, pageSize=page_size)
