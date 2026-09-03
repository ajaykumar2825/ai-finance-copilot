from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_async_session
from backend.dependencies import get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class WatchlistCreateRequest(BaseModel):
    ticker: str = Field(min_length=1, max_length=10)
    label: str | None = Field(default=None, max_length=50)


class WatchlistItem(BaseModel):
    id: str
    ticker: str
    label: str | None = None
    current_price: float | None = None
    change_pct: float | None = None
    created_at: str


class WatchlistListResponse(BaseModel):
    items: list[WatchlistItem]
    total: int


class WatchlistDeleteResponse(BaseModel):
    message: str = "Item removed from watchlist"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "",
    response_model=WatchlistListResponse,
    summary="Get the current user's watchlist",
)
async def get_watchlist(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    include_prices: bool = Query(default=True, description="Fetch live prices"),
) -> WatchlistListResponse:
    """Return the user's watchlist with optional live price enrichment."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    result = await db.execute(
        text(
            """
            SELECT id, ticker, label, created_at
            FROM watchlists
            WHERE user_id = :uid
            ORDER BY created_at DESC
            """
        ),
        {"uid": user_id},
    )
    rows = result.fetchall()

    items: list[WatchlistItem] = []
    for row in rows:
        current_price = None
        change_pct = None

        if include_prices:
            try:
                import yfinance as yf  # type: ignore[import-untyped]

                stock = yf.Ticker(row.ticker)
                data = stock.fast_info
                price = getattr(data, "last_price", None)
                if price is not None:
                    current_price = round(float(price), 2)
                    prev_close = getattr(data, "previous_close", None)
                    if prev_close is not None and float(prev_close) > 0:
                        pv = float(prev_close)
                        change_pct = round(((float(price) - pv) / pv) * 100, 2)
            except Exception:
                pass

        items.append(
            WatchlistItem(
                id=str(row.id),
                ticker=row.ticker,
                label=row.label,
                current_price=current_price,
                change_pct=change_pct,
                created_at=row.created_at.isoformat() if row.created_at else "",
            )
        )

    return WatchlistListResponse(items=items, total=len(items))


@router.post(
    "",
    response_model=WatchlistItem,
    status_code=status.HTTP_201_CREATED,
    summary="Add a ticker to the watchlist",
)
async def add_to_watchlist(
    body: WatchlistCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> WatchlistItem:
    """Add a company ticker to the current user's watchlist."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    ticker = body.ticker.upper()

    # Check for duplicates
    existing = await db.execute(
        text(
            "SELECT id FROM watchlists WHERE user_id = :uid AND ticker = :ticker"
        ),
        {"uid": user_id, "ticker": ticker},
    )
    if existing.fetchone() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"'{ticker}' is already in your watchlist",
        )

    # Validate the ticker exists via yfinance
    try:
        import yfinance as yf  # type: ignore[import-untyped]

        probe = yf.Ticker(ticker)
        info = probe.info
        if not info or info.get("shortName") is None:
            raise ValueError("no data")
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticker '{ticker}' not found",
        )

    item_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    await db.execute(
        text(
            """
            INSERT INTO watchlists (id, user_id, ticker, label, created_at)
            VALUES (:id, :uid, :ticker, :label, :now)
            """
        ),
        {"id": item_id, "uid": user_id, "ticker": ticker, "label": body.label, "now": now},
    )

    return WatchlistItem(
        id=item_id,
        ticker=ticker,
        label=body.label,
        created_at=now.isoformat(),
    )


@router.delete(
    "/{item_id}",
    response_model=WatchlistDeleteResponse,
    summary="Remove an item from the watchlist",
)
async def remove_from_watchlist(
    item_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> WatchlistDeleteResponse:
    """Remove a specific watchlist entry by its ID."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    check = await db.execute(
        text("SELECT id FROM watchlists WHERE id = :iid AND user_id = :uid"),
        {"iid": item_id, "uid": user_id},
    )
    if check.fetchone() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Watchlist item not found",
        )

    await db.execute(
        text("DELETE FROM watchlists WHERE id = :iid AND user_id = :uid"),
        {"iid": item_id, "uid": user_id},
    )

    return WatchlistDeleteResponse()
