from __future__ import annotations

from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field

router = APIRouter()


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class NewsArticle(BaseModel):
    title: str
    url: str
    source: str | None = None
    published_at: str | None = None
    summary: str | None = None
    sentiment: str | None = None  # positive | negative | neutral
    image_url: str | None = None
    related_tickers: list[str] = []


class NewsListResponse(BaseModel):
    articles: list[NewsArticle]
    total: int
    ticker: str | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _fetch_news_from_yfinance(
    ticker: str | None = None,
    limit: int = 20,
) -> list[dict]:
    """Fetch financial news articles using yfinance."""
    try:
        import yfinance as yf  # type: ignore[import-untyped]
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="yfinance is not installed",
        )

    articles: list[dict] = []

    if ticker:
        try:
            stock = yf.Ticker(ticker.upper())
            news_items = stock.news
            if news_items:
                for item in news_items[:limit]:
                    content = item.get("content", {})
                    pub_date = None
                    if content and isinstance(content, dict):
                        pub_date = content.get("pubDate")
                    elif "provider" in item:
                        pub_date = item.get("providerPublishTime")

                    articles.append(
                        {
                            "title": item.get("title", ""),
                            "url": item.get("link", ""),
                            "source": (
                                item.get("publisher", "")
                                or (item.get("provider", {}).get("displayName", ""))
                            ),
                            "published_at": str(pub_date) if pub_date else None,
                            "summary": (
                                content.get("summary", "") if content and isinstance(content, dict) else ""
                            ),
                            "image_url": (
                                content.get("thumbnail", {}).get("resolutions", [{}])[0].get("url")
                                if content
                                and isinstance(content, dict)
                                and content.get("thumbnail", {}).get("resolutions")
                                else None
                            ),
                            "related_tickers": [ticker.upper()],
                        }
                    )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to fetch news for '{ticker}': {exc}",
            )
    else:
        # General market news from yfinance
        try:
            # Use the Search API for general news
            search = yf.Search("stock market", max_results=limit)
            for item in getattr(search, "news", [])[:limit]:
                content = item.get("content", {})
                pub_date = None
                if content and isinstance(content, dict):
                    pub_date = content.get("pubDate")

                articles.append(
                    {
                        "title": item.get("title", ""),
                        "url": item.get("link", ""),
                        "source": item.get("publisher", ""),
                        "published_at": str(pub_date) if pub_date else None,
                        "summary": (
                            content.get("summary", "")
                            if content and isinstance(content, dict)
                            else ""
                        ),
                        "image_url": (
                            content.get("thumbnail", {}).get("resolutions", [{}])[0].get("url")
                            if content
                            and isinstance(content, dict)
                            and content.get("thumbnail", {}).get("resolutions")
                            else None
                        ),
                        "related_tickers": [],
                    }
                )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to fetch market news: {exc}",
            )

    return articles


def _classify_sentiment(title: str) -> str:
    """Simple keyword-based sentiment classifier."""
    title_lower = title.lower()

    positive_words = {
        "surge", "soar", "rally", "gain", "jump", "rise", "record", "high",
        "beat", "outperform", "upgrade", "bull", "boom", "profit", "growth",
        "strong", "positive", "upgrade", "buy", "best",
    }
    negative_words = {
        "crash", "plunge", "drop", "fall", "decline", "loss", "slump", "low",
        "miss", "underperform", "downgrade", "bear", "bust", "recession",
        "weak", "negative", "sell", "worst", "warn", "risk", "debt",
    }

    pos_count = sum(1 for w in positive_words if w in title_lower)
    neg_count = sum(1 for w in negative_words if w in title_lower)

    if pos_count > neg_count:
        return "positive"
    elif neg_count > pos_count:
        return "negative"
    return "neutral"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "",
    response_model=NewsListResponse,
    summary="Get financial news with optional filters",
)
async def list_news(
    ticker: str | None = Query(default=None, description="Filter by ticker symbol"),
    sentiment: str | None = Query(
        default=None,
        description="Filter by sentiment: positive, negative, neutral",
        pattern=r"^(positive|negative|neutral)$",
    ),
    start_date: date | None = Query(default=None, description="Start date (YYYY-MM-DD)"),
    end_date: date | None = Query(default=None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(default=20, ge=1, le=100),
) -> NewsListResponse:
    """Return financial news articles with optional filters.

    Filter by ticker symbol, sentiment, and date range. Uses yfinance for
    real-time financial news data.
    """
    articles_raw = await _fetch_news_from_yfinance(
        ticker=ticker.upper() if ticker else None,
        limit=limit * 3,  # over-fetch to allow for filtering
    )

    # Enrich with sentiment
    articles: list[NewsArticle] = []
    for raw in articles_raw:
        sent = _classify_sentiment(raw.get("title", ""))

        # Apply sentiment filter
        if sentiment and sent != sentiment:
            continue

        # Apply date filter
        pub_at = raw.get("published_at")
        if start_date and pub_at:
            try:
                from datetime import datetime

                parsed = datetime.fromisoformat(pub_at.replace("Z", "+00:00")).date()
                if parsed < start_date:
                    continue
            except (ValueError, TypeError):
                pass

        if end_date and pub_at:
            try:
                from datetime import datetime

                parsed = datetime.fromisoformat(pub_at.replace("Z", "+00:00")).date()
                if parsed > end_date:
                    continue
            except (ValueError, TypeError):
                pass

        articles.append(
            NewsArticle(
                title=raw.get("title", ""),
                url=raw.get("url", ""),
                source=raw.get("source"),
                published_at=raw.get("published_at"),
                summary=raw.get("summary"),
                sentiment=sent,
                image_url=raw.get("image_url"),
                related_tickers=raw.get("related_tickers", []),
            )
        )

    return NewsListResponse(
        articles=articles[:limit],
        total=len(articles),
        ticker=ticker.upper() if ticker else None,
    )


@router.get(
    "/{ticker}",
    response_model=NewsListResponse,
    summary="Get news for a specific company",
)
async def company_news(
    ticker: str,
    limit: int = Query(default=20, ge=1, le=100),
) -> NewsListResponse:
    """Return recent news articles related to a specific company ticker."""
    articles_raw = await _fetch_news_from_yfinance(
        ticker=ticker.upper(),
        limit=limit,
    )

    articles = [
        NewsArticle(
            title=raw.get("title", ""),
            url=raw.get("url", ""),
            source=raw.get("source"),
            published_at=raw.get("published_at"),
            summary=raw.get("summary"),
            sentiment=_classify_sentiment(raw.get("title", "")),
            image_url=raw.get("image_url"),
            related_tickers=[ticker.upper()],
        )
        for raw in articles_raw
    ]

    return NewsListResponse(
        articles=articles[:limit],
        total=len(articles),
        ticker=ticker.upper(),
    )
