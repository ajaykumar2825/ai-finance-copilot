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


class AssetCreateRequest(BaseModel):
    ticker: str = Field(min_length=1, max_length=10)
    name: str = Field(min_length=1, max_length=255)
    asset_type: str = Field(default="stock", pattern=r"^(stock|etf|crypto|bond|other)$")
    quantity: float = Field(gt=0)
    avg_cost_per_unit: float = Field(ge=0)
    currency: str = Field(default="USD", max_length=3)


class AssetUpdateRequest(BaseModel):
    quantity: float | None = Field(default=None, gt=0)
    avg_cost_per_unit: float | None = Field(default=None, ge=0)
    name: str | None = Field(default=None, min_length=1, max_length=255)
    asset_type: str | None = Field(default=None, pattern=r"^(stock|etf|crypto|bond|other)$")


class AssetResponse(BaseModel):
    id: str
    ticker: str
    name: str
    asset_type: str
    quantity: float
    avg_cost_per_unit: float
    currency: str
    current_price: float | None = None
    market_value: float | None = None
    gain_loss: float | None = None
    gain_loss_pct: float | None = None
    created_at: str
    updated_at: str


class AssetListResponse(BaseModel):
    assets: list[AssetResponse]
    total: int


class TransactionCreateRequest(BaseModel):
    asset_id: str
    transaction_type: str = Field(pattern=r"^(buy|sell|dividend|split)$")
    quantity: float = Field(gt=0)
    price_per_unit: float = Field(ge=0)
    fees: float = Field(default=0, ge=0)
    notes: str | None = Field(default=None, max_length=1000)
    executed_at: str | None = None


class TransactionResponse(BaseModel):
    id: str
    asset_id: str
    ticker: str
    transaction_type: str
    quantity: float
    price_per_unit: float
    total_amount: float
    fees: float
    notes: str | None = None
    executed_at: str
    created_at: str


class TransactionListResponse(BaseModel):
    transactions: list[TransactionResponse]
    total: int


class PortfolioSummaryResponse(BaseModel):
    total_market_value: float
    total_cost_basis: float
    total_gain_loss: float
    total_gain_loss_pct: float
    asset_count: int
    currency: str = "USD"
    allocation: list[dict] = []


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_current_price(ticker: str) -> float | None:
    """Fetch the current price for a ticker using yfinance."""
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


# ---------------------------------------------------------------------------
# Asset endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/assets",
    response_model=AssetListResponse,
    summary="List all portfolio assets",
)
async def list_assets(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    include_prices: bool = Query(default=True, description="Fetch current market prices"),
) -> AssetListResponse:
    """Return all assets in the portfolio with optional live price enrichment."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    result = await db.execute(
        text(
            """
            SELECT id, ticker, name, asset_type, quantity, avg_cost_per_unit,
                   currency, created_at, updated_at
            FROM portfolio_assets
            WHERE user_id = :uid
            ORDER BY created_at DESC
            """
        ),
        {"uid": user_id},
    )
    rows = result.fetchall()

    assets: list[AssetResponse] = []
    for row in rows:
        current_price = await _get_current_price(row.ticker) if include_prices else None
        market_value = (
            round(current_price * row.quantity, 2) if current_price is not None else None
        )
        cost_basis = round(row.avg_cost_per_unit * row.quantity, 2)
        gain_loss = (
            round(market_value - cost_basis, 2) if market_value is not None else None
        )
        gain_loss_pct = (
            round((gain_loss / cost_basis) * 100, 2)
            if cost_basis > 0 and gain_loss is not None
            else None
        )

        assets.append(
            AssetResponse(
                id=str(row.id),
                ticker=row.ticker,
                name=row.name,
                asset_type=row.asset_type,
                quantity=row.quantity,
                avg_cost_per_unit=row.avg_cost_per_unit,
                currency=row.currency,
                current_price=round(current_price, 2) if current_price else None,
                market_value=market_value,
                gain_loss=gain_loss,
                gain_loss_pct=gain_loss_pct,
                created_at=row.created_at.isoformat() if row.created_at else "",
                updated_at=row.updated_at.isoformat() if row.updated_at else "",
            )
        )

    return AssetListResponse(assets=assets, total=len(assets))


@router.post(
    "/assets",
    response_model=AssetResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add an asset to the portfolio",
)
async def create_asset(
    body: AssetCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> AssetResponse:
    """Add a new investment asset (stock, ETF, crypto, etc.) to the portfolio."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")
    asset_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    await db.execute(
        text(
            """
            INSERT INTO portfolio_assets
                (id, user_id, ticker, name, asset_type, quantity,
                 avg_cost_per_unit, currency, created_at, updated_at)
            VALUES
                (:id, :uid, :ticker, :name, :type, :qty,
                 :avg, :currency, :now, :now)
            """
        ),
        {
            "id": asset_id,
            "uid": user_id,
            "ticker": body.ticker.upper(),
            "name": body.name,
            "type": body.asset_type,
            "qty": body.quantity,
            "avg": body.avg_cost_per_unit,
            "currency": body.currency.upper(),
            "now": now,
        },
    )

    return AssetResponse(
        id=asset_id,
        ticker=body.ticker.upper(),
        name=body.name,
        asset_type=body.asset_type,
        quantity=body.quantity,
        avg_cost_per_unit=body.avg_cost_per_unit,
        currency=body.currency.upper(),
        created_at=now.isoformat(),
        updated_at=now.isoformat(),
    )


@router.put(
    "/assets/{asset_id}",
    response_model=AssetResponse,
    summary="Update a portfolio asset",
)
async def update_asset(
    asset_id: str,
    body: AssetUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> AssetResponse:
    """Update quantity, cost basis, or metadata of an existing asset."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    check = await db.execute(
        text("SELECT id FROM portfolio_assets WHERE id = :aid AND user_id = :uid"),
        {"aid": asset_id, "uid": user_id},
    )
    if check.fetchone() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found",
        )

    updates: list[str] = ["updated_at = NOW()"]
    params: dict = {"aid": asset_id}

    if body.quantity is not None:
        updates.append("quantity = :qty")
        params["qty"] = body.quantity
    if body.avg_cost_per_unit is not None:
        updates.append("avg_cost_per_unit = :avg")
        params["avg"] = body.avg_cost_per_unit
    if body.name is not None:
        updates.append("name = :name")
        params["name"] = body.name
    if body.asset_type is not None:
        updates.append("asset_type = :type")
        params["type"] = body.asset_type

    set_clause = ", ".join(updates)
    await db.execute(
        text(f"UPDATE portfolio_assets SET {set_clause} WHERE id = :aid"),
        params,
    )

    result = await db.execute(
        text(
            """
            SELECT id, ticker, name, asset_type, quantity, avg_cost_per_unit,
                   currency, created_at, updated_at
            FROM portfolio_assets WHERE id = :aid
            """
        ),
        {"aid": asset_id},
    )
    row = result.fetchone()

    return AssetResponse(
        id=str(row.id),
        ticker=row.ticker,
        name=row.name,
        asset_type=row.asset_type,
        quantity=row.quantity,
        avg_cost_per_unit=row.avg_cost_per_unit,
        currency=row.currency,
        created_at=row.created_at.isoformat() if row.created_at else "",
        updated_at=row.updated_at.isoformat() if row.updated_at else "",
    )


@router.delete(
    "/assets/{asset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove an asset from the portfolio",
)
async def delete_asset(
    asset_id: str,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> None:
    """Permanently remove an asset and its transaction history."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    check = await db.execute(
        text("SELECT id FROM portfolio_assets WHERE id = :aid AND user_id = :uid"),
        {"aid": asset_id, "uid": user_id},
    )
    if check.fetchone() is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found",
        )

    await db.execute(
        text("DELETE FROM portfolio_transactions WHERE asset_id = :aid"),
        {"aid": asset_id},
    )
    await db.execute(
        text("DELETE FROM portfolio_assets WHERE id = :aid AND user_id = :uid"),
        {"aid": asset_id, "uid": user_id},
    )


# ---------------------------------------------------------------------------
# Transaction endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/transactions",
    response_model=TransactionListResponse,
    summary="List all portfolio transactions",
)
async def list_transactions(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
    asset_id: str | None = Query(default=None, description="Filter by asset"),
    transaction_type: str | None = Query(default=None, description="Filter by type"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
) -> TransactionListResponse:
    """Return transactions with optional filters."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    conditions = ["pt.user_id = :uid"]
    params: dict = {"uid": user_id, "limit": limit, "offset": offset}

    if asset_id:
        conditions.append("pt.asset_id = :aid")
        params["aid"] = asset_id
    if transaction_type:
        conditions.append("pt.transaction_type = :ttype")
        params["ttype"] = transaction_type

    where_clause = " AND ".join(conditions)

    result = await db.execute(
        text(
            f"""
            SELECT pt.id, pt.asset_id, pa.ticker, pt.transaction_type,
                   pt.quantity, pt.price_per_unit, pt.total_amount,
                   pt.fees, pt.notes, pt.executed_at, pt.created_at
            FROM portfolio_transactions pt
            JOIN portfolio_assets pa ON pa.id = pt.asset_id
            WHERE {where_clause}
            ORDER BY pt.executed_at DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    )
    rows = result.fetchall()

    count_result = await db.execute(
        text(
            f"""
            SELECT COUNT(*)
            FROM portfolio_transactions pt
            WHERE {where_clause}
            """
        ),
        params,
    )
    total = count_result.scalar() or 0

    transactions = [
        TransactionResponse(
            id=str(row.id),
            asset_id=str(row.asset_id),
            ticker=row.ticker,
            transaction_type=row.transaction_type,
            quantity=row.quantity,
            price_per_unit=row.price_per_unit,
            total_amount=row.total_amount,
            fees=row.fees,
            notes=row.notes,
            executed_at=row.executed_at.isoformat() if row.executed_at else "",
            created_at=row.created_at.isoformat() if row.created_at else "",
        )
        for row in rows
    ]

    return TransactionListResponse(transactions=transactions, total=total)


@router.post(
    "/transactions",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record a new transaction",
)
async def create_transaction(
    body: TransactionCreateRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> TransactionResponse:
    """Record a buy, sell, dividend, or split transaction for an asset."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    # Verify asset ownership
    asset_result = await db.execute(
        text(
            "SELECT id, ticker FROM portfolio_assets WHERE id = :aid AND user_id = :uid"
        ),
        {"aid": body.asset_id, "uid": user_id},
    )
    asset_row = asset_result.fetchone()
    if asset_row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found",
        )

    tx_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    total_amount = round(body.quantity * body.price_per_unit, 2)
    executed_at = (
        datetime.fromisoformat(body.executed_at) if body.executed_at else now
    )

    await db.execute(
        text(
            """
            INSERT INTO portfolio_transactions
                (id, user_id, asset_id, transaction_type, quantity, price_per_unit,
                 total_amount, fees, notes, executed_at, created_at)
            VALUES
                (:id, :uid, :aid, :ttype, :qty, :price,
                 :total, :fees, :notes, :exec, :now)
            """
        ),
        {
            "id": tx_id,
            "uid": user_id,
            "aid": body.asset_id,
            "ttype": body.transaction_type,
            "qty": body.quantity,
            "price": body.price_per_unit,
            "total": total_amount,
            "fees": body.fees,
            "notes": body.notes,
            "exec": executed_at,
            "now": now,
        },
    )

    # Update asset average cost on buy
    if body.transaction_type == "buy":
        asset_result2 = await db.execute(
            text(
                "SELECT quantity, avg_cost_per_unit FROM portfolio_assets WHERE id = :aid"
            ),
            {"aid": body.asset_id},
        )
        current = asset_result2.fetchone()
        if current:
            old_qty = current.quantity
            old_avg = current.avg_cost_per_unit
            new_qty = old_qty + body.quantity
            new_avg = (
                ((old_avg * old_qty) + (body.price_per_unit * body.quantity)) / new_qty
                if new_qty > 0
                else 0
            )
            await db.execute(
                text(
                    "UPDATE portfolio_assets SET quantity = :qty, avg_cost_per_unit = :avg, updated_at = NOW() WHERE id = :aid"
                ),
                {"qty": new_qty, "avg": round(new_avg, 6), "aid": body.asset_id},
            )

    # Decrease quantity on sell
    if body.transaction_type == "sell":
        await db.execute(
            text(
                """
                UPDATE portfolio_assets
                SET quantity = GREATEST(quantity - :qty, 0), updated_at = NOW()
                WHERE id = :aid
                """
            ),
            {"qty": body.quantity, "aid": body.asset_id},
        )

    return TransactionResponse(
        id=tx_id,
        asset_id=body.asset_id,
        ticker=asset_row.ticker,
        transaction_type=body.transaction_type,
        quantity=body.quantity,
        price_per_unit=body.price_per_unit,
        total_amount=total_amount,
        fees=body.fees,
        notes=body.notes,
        executed_at=executed_at.isoformat(),
        created_at=now.isoformat(),
    )


# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------


@router.get(
    "/summary",
    response_model=PortfolioSummaryResponse,
    summary="Get portfolio summary with totals and allocation",
)
async def portfolio_summary(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> PortfolioSummaryResponse:
    """Return aggregated portfolio metrics: total value, cost basis, gain/loss, and allocation breakdown."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    result = await db.execute(
        text(
            """
            SELECT ticker, quantity, avg_cost_per_unit, currency
            FROM portfolio_assets
            WHERE user_id = :uid
            """
        ),
        {"uid": user_id},
    )
    rows = result.fetchall()

    if not rows:
        return PortfolioSummaryResponse(
            total_market_value=0,
            total_cost_basis=0,
            total_gain_loss=0,
            total_gain_loss_pct=0,
            asset_count=0,
        )

    total_cost = 0.0
    total_market = 0.0
    allocation: list[dict] = []

    for row in rows:
        cost_basis = row.avg_cost_per_unit * row.quantity
        total_cost += cost_basis

        price = await _get_current_price(row.ticker)
        mv = (price * row.quantity) if price is not None else cost_basis
        total_market += mv

        allocation.append(
            {
                "ticker": row.ticker,
                "market_value": round(mv, 2),
                "weight": 0,  # calculated below
            }
        )

    total_gain = round(total_market - total_cost, 2)
    total_gain_pct = round((total_gain / total_cost) * 100, 2) if total_cost > 0 else 0

    # Calculate allocation weights
    for item in allocation:
        item["weight"] = (
            round((item["market_value"] / total_market) * 100, 2)
            if total_market > 0
            else 0
        )

    # Sort by weight descending
    allocation.sort(key=lambda x: x["weight"], reverse=True)

    return PortfolioSummaryResponse(
        total_market_value=round(total_market, 2),
        total_cost_basis=round(total_cost, 2),
        total_gain_loss=total_gain,
        total_gain_loss_pct=total_gain_pct,
        asset_count=len(rows),
        currency="USD",
        allocation=allocation,
    )
