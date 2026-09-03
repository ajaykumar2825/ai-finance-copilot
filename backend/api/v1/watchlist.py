from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_async_session
from backend.dependencies import get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas (match the frontend contract exactly)
# ---------------------------------------------------------------------------


class WatchlistCreateRequest(BaseModel):
    ticker: str = Field(min_length=1, max_length=20)
    name: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=1000)


class WatchlistItem(BaseModel):
    id: str
    userId: str
    ticker: str
    name: str | None = None
    notes: str | None = None
    currentPrice: float | None = None
    changePercent: float | None = None
    createdAt: str = ""


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=list[WatchlistItem], summary="Get the current user's watchlist")
async def get_watchlist(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    include_prices: bool = Query(default=True, description="Fetch live prices"),
) -> list[WatchlistItem]:
    """Return the user's watchlist as a bare array (frontend contract)."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    try:
        result = await db.execute(
            text(
                """
                SELECT id, user_id, ticker, name, notes, created_at
                FROM watchlist
                WHERE user_id = :uid
                ORDER BY created_at DESC
                """
            ),
            {"uid": user_id},
        )
        rows = result.fetchall()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load watchlist: {exc}",
        )

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
                userId=str(row.user_id),
                ticker=row.ticker,
                name=row.name,
                notes=row.notes,
                currentPrice=current_price,
                changePercent=change_pct,
                createdAt=row.created_at.isoformat() if row.created_at else "",
            )
        )

    return items


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

    existing = await db.execute(
        text("SELECT id FROM watchlist WHERE user_id = :uid AND ticker = :ticker"),
        {"uid": user_id, "ticker": ticker},
    )
    if existing.fetchone() is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"'{ticker}' is already in your watchlist")

    item_id = str(uuid.uuid4())
    now = datetime.utcnow()

    try:
        await db.execute(
            text(
                """
                INSERT INTO watchlist (id, user_id, ticker, name, notes, created_at)
                VALUES (:id, :uid, :ticker, :name, :notes, :now)
                """
            ),
            {"id": item_id, "uid": user_id, "ticker": ticker, "name": body.name, "notes": body.notes, "now": now},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add to watchlist: {exc}",
        )

    return WatchlistItem(
        id=item_id,
        userId=user_id,
        ticker=ticker,
        name=body.name,
        notes=body.notes,
        createdAt=now.isoformat(),
    )


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove an item from the watchlist")
async def remove_from_watchlist(
    item_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> Response:
    """Remove a specific watchlist entry by its ID."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    check = await db.execute(
        text("SELECT id FROM watchlist WHERE id = :iid AND user_id = :uid"),
        {"iid": item_id, "uid": user_id},
    )
    if check.fetchone() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Watchlist item not found")

    await db.execute(
        text("DELETE FROM watchlist WHERE id = :iid AND user_id = :uid"),
        {"iid": item_id, "uid": user_id},
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)
