from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from backend.database import async_session_factory

logger = logging.getLogger(__name__)


class PortfolioService:
    """Manage user assets and transactions with P/L tracking."""

    # ------------------------------------------------------------------
    # Assets
    # ------------------------------------------------------------------

    async def get_assets(self, user_id: str) -> list[dict[str, Any]]:
        async with async_session_factory() as session:
            result = await session.execute(
                __import__("sqlalchemy").text(
                    """
                    SELECT id, user_id, ticker, name, quantity, avg_cost,
                           asset_type, created_at, updated_at
                    FROM portfolio_assets
                    WHERE user_id = :user_id
                    ORDER BY created_at DESC
                    """
                ),
                {"user_id": user_id},
            )
            return [dict(r) for r in result.mappings().all()]

    async def add_asset(
        self,
        user_id: str,
        ticker: str,
        name: str,
        quantity: float,
        avg_cost: float,
        asset_type: str = "stock",
    ) -> dict[str, Any]:
        asset_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        async with async_session_factory() as session:
            await session.execute(
                __import__("sqlalchemy").text(
                    """
                    INSERT INTO portfolio_assets (
                        id, user_id, ticker, name, quantity, avg_cost,
                        asset_type, created_at, updated_at
                    ) VALUES (
                        :id, :user_id, :ticker, :name, :quantity, :avg_cost,
                        :asset_type, :created_at, :updated_at
                    )
                    """
                ),
                {
                    "id": asset_id,
                    "user_id": user_id,
                    "ticker": ticker.upper(),
                    "name": name,
                    "quantity": quantity,
                    "avg_cost": avg_cost,
                    "asset_type": asset_type,
                    "created_at": now,
                    "updated_at": now,
                },
            )
            await session.commit()

        return {
            "id": asset_id,
            "user_id": user_id,
            "ticker": ticker.upper(),
            "name": name,
            "quantity": quantity,
            "avg_cost": avg_cost,
            "asset_type": asset_type,
            "created_at": now.isoformat(),
        }

    async def update_asset(
        self,
        asset_id: str,
        user_id: str,
        **fields: Any,
    ) -> dict[str, Any] | None:
        allowed = {"ticker", "name", "quantity", "avg_cost", "asset_type"}
        updates = {k: v for k, v in fields.items() if k in allowed}
        if not updates:
            return await self._get_asset(asset_id, user_id)

        set_clauses = [f"{k} = :{k}" for k in updates]
        updates["asset_id"] = asset_id
        updates["user_id"] = user_id
        updates["now"] = datetime.now(timezone.utc)
        set_clauses.append("updated_at = :now")

        async with async_session_factory() as session:
            await session.execute(
                __import__("sqlalchemy").text(
                    f"""
                    UPDATE portfolio_assets
                    SET {', '.join(set_clauses)}
                    WHERE id = :asset_id AND user_id = :user_id
                    """
                ),
                updates,
            )
            await session.commit()
        return await self._get_asset(asset_id, user_id)

    async def delete_asset(self, asset_id: str, user_id: str) -> bool:
        async with async_session_factory() as session:
            result = await session.execute(
                __import__("sqlalchemy").text(
                    """
                    DELETE FROM portfolio_assets
                    WHERE id = :asset_id AND user_id = :user_id
                    """
                ),
                {"asset_id": asset_id, "user_id": user_id},
            )
            await session.commit()
            return result.rowcount > 0

    # ------------------------------------------------------------------
    # Transactions
    # ------------------------------------------------------------------

    async def get_transactions(
        self,
        user_id: str,
        ticker: str | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        async with async_session_factory() as session:
            params: dict[str, Any] = {"user_id": user_id, "limit": limit}
            where = "WHERE t.user_id = :user_id"
            if ticker:
                where += " AND t.ticker = :ticker"
                params["ticker"] = ticker.upper()

            result = await session.execute(
                __import__("sqlalchemy").text(
                    f"""
                    SELECT t.id, t.user_id, t.ticker, t.action, t.quantity,
                           t.price, t.fee, t.executed_at, t.created_at
                    FROM portfolio_transactions t
                    {where}
                    ORDER BY t.executed_at DESC
                    LIMIT :limit
                    """
                ),
                params,
            )
            return [dict(r) for r in result.mappings().all()]

    async def add_transaction(
        self,
        user_id: str,
        ticker: str,
        action: str,
        quantity: float,
        price: float,
        fee: float = 0.0,
        executed_at: datetime | None = None,
    ) -> dict[str, Any]:
        if action not in ("buy", "sell"):
            raise ValueError("action must be 'buy' or 'sell'")

        tx_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)
        exec_at = executed_at or now

        async with async_session_factory() as session:
            await session.execute(
                __import__("sqlalchemy").text(
                    """
                    INSERT INTO portfolio_transactions (
                        id, user_id, ticker, action, quantity, price, fee,
                        executed_at, created_at
                    ) VALUES (
                        :id, :user_id, :ticker, :action, :quantity, :price, :fee,
                        :executed_at, :created_at
                    )
                    """
                ),
                {
                    "id": tx_id,
                    "user_id": user_id,
                    "ticker": ticker.upper(),
                    "action": action,
                    "quantity": quantity,
                    "price": price,
                    "fee": fee,
                    "executed_at": exec_at,
                    "created_at": now,
                },
            )
            await session.commit()

        return {
            "id": tx_id,
            "user_id": user_id,
            "ticker": ticker.upper(),
            "action": action,
            "quantity": quantity,
            "price": price,
            "fee": fee,
            "executed_at": exec_at.isoformat(),
        }

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------

    async def get_summary(
        self,
        user_id: str,
        current_prices: dict[str, float] | None = None,
    ) -> dict[str, Any]:
        """Compute portfolio summary including unrealised P/L.

        ``current_prices`` is an optional ``{ticker: price}`` map. When
        omitted, P/L is computed using the last transaction price for each
        ticker.
        """
        assets = await self.get_assets(user_id)

        total_cost = 0.0
        total_value = 0.0
        holdings: list[dict[str, Any]] = []

        for asset in assets:
            qty = float(asset["quantity"])
            avg = float(asset["avg_cost"])
            cost_basis = qty * avg
            ticker = asset["ticker"]

            if current_prices and ticker in current_prices:
                current_price = current_prices[ticker]
            else:
                current_price = avg  # fallback

            market_value = qty * current_price
            pl = market_value - cost_basis
            pl_pct = (pl / cost_basis * 100) if cost_basis else 0.0

            total_cost += cost_basis
            total_value += market_value

            holdings.append(
                {
                    "ticker": ticker,
                    "name": asset["name"],
                    "quantity": qty,
                    "avg_cost": avg,
                    "current_price": current_price,
                    "market_value": round(market_value, 2),
                    "unrealized_pl": round(pl, 2),
                    "unrealized_pl_pct": round(pl_pct, 2),
                    "asset_type": asset["asset_type"],
                }
            )

        total_pl = total_value - total_cost
        total_pl_pct = (total_pl / total_cost * 100) if total_cost else 0.0

        return {
            "user_id": user_id,
            "total_cost": round(total_cost, 2),
            "total_value": round(total_value, 2),
            "total_unrealized_pl": round(total_pl, 2),
            "total_unrealized_pl_pct": round(total_pl_pct, 2),
            "asset_count": len(holdings),
            "holdings": holdings,
        }

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _get_asset(self, asset_id: str, user_id: str) -> dict[str, Any] | None:
        async with async_session_factory() as session:
            result = await session.execute(
                __import__("sqlalchemy").text(
                    """
                    SELECT id, user_id, ticker, name, quantity, avg_cost,
                           asset_type, created_at, updated_at
                    FROM portfolio_assets
                    WHERE id = :asset_id AND user_id = :user_id
                    """
                ),
                {"asset_id": asset_id, "user_id": user_id},
            )
            row = result.mappings().first()
            return dict(row) if row else None
