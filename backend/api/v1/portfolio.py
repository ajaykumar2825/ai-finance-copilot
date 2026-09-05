from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

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


class Asset(BaseModel):
    id: str
    userId: str
    ticker: str
    name: str
    quantity: float
    avgCost: float
    sector: str | None = None
    currentPrice: float | None = None
    changePercent: float | None = None
    createdAt: str = ""


class AssetCreateRequest(BaseModel):
    ticker: str = Field(min_length=1, max_length=20)
    name: str = Field(min_length=1, max_length=255)
    quantity: float = Field(ge=0)
    avgCost: float = Field(ge=0)
    sector: str | None = Field(default=None, max_length=100)


class AssetUpdateRequest(BaseModel):
    quantity: float | None = Field(default=None, ge=0)
    avgCost: float | None = Field(default=None, ge=0)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    sector: str | None = Field(default=None, max_length=100)


class Transaction(BaseModel):
    id: str
    userId: str
    ticker: str
    type: str
    quantity: float
    price: float
    total: float
    notes: str | None = None
    createdAt: str = ""


class TransactionCreateRequest(BaseModel):
    ticker: str = Field(min_length=1, max_length=20)
    type: str = Field(pattern=r"^(buy|sell|dividend)$")
    quantity: float = Field(gt=0)
    price: float = Field(ge=0)
    notes: str | None = Field(default=None, max_length=1000)


class TransactionListResponse(BaseModel):
    items: list[Transaction]
    total: int
    page: int
    pageSize: int


class PortfolioSummary(BaseModel):
    totalValue: float = 0
    totalCost: float = 0
    totalPL: float = 0
    plPercent: float = 0
    sectorAllocation: list[dict] = []


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _num(value) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _to_asset(row) -> Asset:
    return Asset(
        id=str(row.id),
        userId=str(row.user_id),
        ticker=row.ticker,
        name=row.name,
        quantity=_num(row.quantity),
        avgCost=_num(row.avg_cost),
        sector=getattr(row, "sector", None),
        createdAt=row.created_at.isoformat() if getattr(row, "created_at", None) else "",
    )


async def _get_current_price(ticker: str) -> float | None:
    """Fetch the current price for a ticker using yfinance. Never raises."""
    try:
        import yfinance as yf  # type: ignore[import-untyped]

        stock = yf.Ticker(ticker)
        data = stock.fast_info
        price = getattr(data, "last_price", None)
        if price is None:
            hist = stock.history(period="1d")
            if not hist.empty:
                price = float(hist["Close"].iloc[-1])
        return float(price) if price is not None else None
    except Exception:
        return None


async def _enrich_with_prices(assets: list[Asset], include_prices: bool) -> list[Asset]:
    if not include_prices:
        return assets
    for asset in assets:
        price = await _get_current_price(asset.ticker)
        if price is not None:
            asset.currentPrice = round(price, 2)
            if asset.avgCost > 0:
                asset.changePercent = round(((price - asset.avgCost) / asset.avgCost) * 100, 2)
    return assets


# ---------------------------------------------------------------------------
# Asset endpoints
# ---------------------------------------------------------------------------


@router.get("/assets", response_model=list[Asset], summary="List all portfolio assets")
async def list_assets(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    include_prices: bool = Query(default=True, description="Fetch current market prices"),
) -> list[Asset]:
    """Return all assets in the portfolio as a bare array (frontend contract)."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    try:
        result = await db.execute(
            text(
                """
                SELECT id, user_id, ticker, name, quantity, avg_cost, sector, created_at, updated_at
                FROM portfolio_assets
                WHERE user_id = :uid
                ORDER BY created_at DESC
                """
            ),
            {"uid": user_id},
        )
        rows = result.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to load assets: {exc}")

    assets = [_to_asset(r) for r in rows]
    return await _enrich_with_prices(assets, include_prices)


@router.post("/assets", response_model=Asset, status_code=status.HTTP_201_CREATED, summary="Add an asset")
async def create_asset(
    body: AssetCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> Asset:
    """Add a new investment asset."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")
    asset_id = str(uuid.uuid4())
    now = datetime.utcnow()

    try:
        await db.execute(
            text(
                """
                INSERT INTO portfolio_assets
                    (id, user_id, ticker, name, quantity, avg_cost, sector, created_at, updated_at)
                VALUES (:id, :uid, :ticker, :name, :qty, :avg, :sector, :now, :now)
                """
            ),
            {
                "id": asset_id,
                "uid": user_id,
                "ticker": body.ticker.upper(),
                "name": body.name,
                "qty": body.quantity,
                "avg": body.avgCost,
                "sector": body.sector,
                "now": now,
            },
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to add asset: {exc}")

    return Asset(
        id=asset_id,
        userId=user_id,
        ticker=body.ticker.upper(),
        name=body.name,
        quantity=body.quantity,
        avgCost=body.avgCost,
        sector=body.sector,
        createdAt=now.isoformat(),
    )


@router.put("/assets/{asset_id}", response_model=Asset, summary="Update a portfolio asset")
async def update_asset(
    asset_id: str,
    body: AssetUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> Asset:
    """Update quantity, cost basis, or metadata of an existing asset."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    check = await db.execute(
        text("SELECT id FROM portfolio_assets WHERE id = :aid AND user_id = :uid"),
        {"aid": asset_id, "uid": user_id},
    )
    if check.fetchone() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    updates: list[str] = ["updated_at = :now"]
    params: dict = {"aid": asset_id, "uid": user_id, "now": datetime.utcnow()}

    if body.quantity is not None:
        updates.append("quantity = :qty")
        params["qty"] = body.quantity
    if body.avgCost is not None:
        updates.append("avg_cost = :avg")
        params["avg"] = body.avgCost
    if body.name is not None:
        updates.append("name = :name")
        params["name"] = body.name
    if body.sector is not None:
        updates.append("sector = :sector")
        params["sector"] = body.sector

    set_clause = ", ".join(updates)
    await db.execute(
        text(f"UPDATE portfolio_assets SET {set_clause} WHERE id = :aid AND user_id = :uid"),
        params,
    )

    result = await db.execute(
        text(
            """
            SELECT id, user_id, ticker, name, quantity, avg_cost, sector, created_at, updated_at
            FROM portfolio_assets WHERE id = :aid
            """
        ),
        {"aid": asset_id},
    )
    row = result.fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    return _to_asset(row)


@router.delete("/assets/{asset_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove an asset")
async def delete_asset(
    asset_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> Response:
    """Permanently remove an asset and its transaction history."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    check = await db.execute(
        text("SELECT id FROM portfolio_assets WHERE id = :aid AND user_id = :uid"),
        {"aid": asset_id, "uid": user_id},
    )
    if check.fetchone() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")

    await db.execute(text("DELETE FROM portfolio_transactions WHERE asset_id = :aid"), {"aid": asset_id})
    await db.execute(
        text("DELETE FROM portfolio_assets WHERE id = :aid AND user_id = :uid"),
        {"aid": asset_id, "uid": user_id},
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)


# ---------------------------------------------------------------------------
# Transaction endpoints
# ---------------------------------------------------------------------------


@router.get("/transactions", response_model=TransactionListResponse, summary="List portfolio transactions")
async def list_transactions(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    asset_id: str | None = Query(default=None),
    transaction_type: str | None = Query(default=None),
) -> TransactionListResponse:
    """Return transactions with pagination and optional filters."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")
    offset = (page - 1) * page_size

    conditions = ["user_id = :uid"]
    params: dict = {"uid": user_id}

    if asset_id:
        conditions.append("asset_id = :aid")
        params["aid"] = asset_id
    if transaction_type:
        conditions.append("type = :ttype")
        params["ttype"] = transaction_type

    where_clause = " AND ".join(conditions)

    try:
        count_result = await db.execute(
            text(f"SELECT COUNT(*) FROM portfolio_transactions WHERE {where_clause}"), params
        )
        total = count_result.scalar() or 0

        result = await db.execute(
            text(
                f"""
                SELECT id, user_id, asset_id, ticker, type, quantity, price, total,
                       fees, notes, executed_at, created_at
                FROM portfolio_transactions
                WHERE {where_clause}
                ORDER BY executed_at DESC NULLS LAST, created_at DESC
                LIMIT :limit OFFSET :offset
                """
            ),
            {**params, "limit": page_size, "offset": offset},
        )
        rows = result.fetchall()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load transactions: {exc}",
        )

    items = [
        Transaction(
            id=str(row.id),
            userId=str(row.user_id),
            ticker=row.ticker,
            type=row.type,
            quantity=_num(row.quantity),
            price=_num(row.price),
            total=_num(row.total),
            notes=row.notes,
            createdAt=row.created_at.isoformat() if row.created_at else "",
        )
        for row in rows
    ]

    return TransactionListResponse(items=items, total=total, page=page, pageSize=page_size)


@router.post(
    "/transactions",
    response_model=Transaction,
    status_code=status.HTTP_201_CREATED,
    summary="Record a transaction",
)
async def create_transaction(
    body: TransactionCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> Transaction:
    """Record a buy, sell, or dividend transaction."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")
    tx_id = str(uuid.uuid4())
    now = datetime.utcnow()
    total = round(body.quantity * body.price, 2)

    # Find (or optionally create) a matching asset so transactions link to holdings.
    asset_id: str | None = None
    asset_row = await db.execute(
        text("SELECT id FROM portfolio_assets WHERE user_id = :uid AND ticker = :ticker"),
        {"uid": user_id, "ticker": body.ticker.upper()},
    )
    existing = asset_row.fetchone()
    if existing:
        asset_id = str(existing.id)

    try:
        await db.execute(
            text(
                """
                INSERT INTO portfolio_transactions
                    (id, user_id, asset_id, ticker, type, quantity, price, total,
                     fees, notes, executed_at, created_at)
                VALUES (:id, :uid, :aid, :ticker, :type, :qty, :price, :total,
                        :fees, :notes, :now, :now)
                """
            ),
            {
                "id": tx_id,
                "uid": user_id,
                "aid": asset_id,
                "ticker": body.ticker.upper(),
                "type": body.type,
                "qty": body.quantity,
                "price": body.price,
                "total": total,
                "fees": 0,
                "notes": body.notes,
                "now": now,
            },
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to record transaction: {exc}",
        )

    return Transaction(
        id=tx_id,
        userId=user_id,
        ticker=body.ticker.upper(),
        type=body.type,
        quantity=body.quantity,
        price=body.price,
        total=total,
        notes=body.notes,
        createdAt=now.isoformat(),
    )


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------


@router.get("/summary", response_model=PortfolioSummary, summary="Get portfolio summary")
async def portfolio_summary(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> PortfolioSummary:
    """Return aggregated portfolio metrics matching the frontend PortfolioSummary shape."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    try:
        result = await db.execute(
            text("SELECT ticker, name, quantity, avg_cost, sector FROM portfolio_assets WHERE user_id = :uid"),
            {"uid": user_id},
        )
        rows = result.fetchall()
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to load summary: {exc}")

    if not rows:
        return PortfolioSummary()

    total_cost = 0.0
    sector_values: dict[str, float] = {}
    # Use cost basis as the market proxy when live prices are unavailable.
    for row in rows:
        qty = _num(row.quantity)
        avg = _num(row.avg_cost)
        cost_basis = qty * avg
        total_cost += cost_basis
        sector = row.sector or "Other"
        sector_values[sector] = sector_values.get(sector, 0.0) + cost_basis

    total_value = total_cost
    total_pl = total_value - total_cost
    pl_percent = (total_pl / total_cost * 100) if total_cost else 0.0

    sector_allocation = [
        {
            "sector": sector,
            "value": round(value, 2),
            "percent": round((value / total_cost) * 100, 2) if total_cost else 0.0,
        }
        for sector, value in sorted(sector_values.items(), key=lambda kv: kv[1], reverse=True)
    ]

    return PortfolioSummary(
        totalValue=round(total_value, 2),
        totalCost=round(total_cost, 2),
        totalPL=round(total_pl, 2),
        plPercent=round(pl_percent, 2),
        sectorAllocation=sector_allocation,
    )
