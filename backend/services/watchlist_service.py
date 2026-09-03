from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from backend.database import async_session_factory
from backend.services.company_service import CompanyService

logger = logging.getLogger(__name__)


class WatchlistService:
    """User watchlists with live price lookups."""

    async def get_watchlist(
        self,
        user_id: str,
        list_name: str = "default",
    ) -> list[dict[str, Any]]:
        async with async_session_factory() as session:
            result = await session.execute(
                __import__("sqlalchemy").text(
                    """
                    SELECT id, user_id, ticker, name, list_name, notes,
                           created_at
                    FROM watchlist_items
                    WHERE user_id = :user_id AND list_name = :list_name
                    ORDER BY created_at DESC
                    """
                ),
                {"user_id": user_id, "list_name": list_name},
            )
            return [dict(r) for r in result.mappings().all()]

    async def add_item(
        self,
        user_id: str,
        ticker: str,
        name: str = "",
        list_name: str = "default",
        notes: str = "",
    ) -> dict[str, Any]:
        # Check for duplicates
        existing = await self._find_item(user_id, ticker.upper(), list_name)
        if existing is not None:
            raise ValueError(
                f"{ticker.upper()} is already in watchlist '{list_name}'"
            )

        item_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        async with async_session_factory() as session:
            await session.execute(
                __import__("sqlalchemy").text(
                    """
                    INSERT INTO watchlist_items (
                        id, user_id, ticker, name, list_name, notes, created_at
                    ) VALUES (
                        :id, :user_id, :ticker, :name, :list_name, :notes,
                        :created_at
                    )
                    """
                ),
                {
                    "id": item_id,
                    "user_id": user_id,
                    "ticker": ticker.upper(),
                    "name": name,
                    "list_name": list_name,
                    "notes": notes,
                    "created_at": now,
                },
            )
            await session.commit()

        return {
            "id": item_id,
            "user_id": user_id,
            "ticker": ticker.upper(),
            "name": name,
            "list_name": list_name,
            "notes": notes,
            "created_at": now.isoformat(),
        }

    async def remove_item(
        self,
        user_id: str,
        item_id: str,
    ) -> bool:
        async with async_session_factory() as session:
            result = await session.execute(
                __import__("sqlalchemy").text(
                    """
                    DELETE FROM watchlist_items
                    WHERE id = :item_id AND user_id = :user_id
                    """
                ),
                {"item_id": item_id, "user_id": user_id},
            )
            await session.commit()
            return result.rowcount > 0

    async def get_prices(
        self,
        user_id: str,
        list_name: str = "default",
    ) -> list[dict[str, Any]]:
        """Return watchlist items enriched with live price data."""
        items = await self.get_watchlist(user_id, list_name)
        if not items:
            return []

        svc = CompanyService()
        enriched: list[dict[str, Any]] = []

        for item in items:
            ticker = item["ticker"]
            try:
                price_data = await svc.get_stock_price(ticker)
            except Exception as exc:
                logger.warning("Price fetch for %s failed: %s", ticker, exc)
                price_data = {"price": None, "error": str(exc)}

            enriched.append({
                **item,
                "current_price": price_data.get("price"),
                "open": price_data.get("open"),
                "high": price_data.get("high"),
                "low": price_data.get("low"),
                "volume": price_data.get("volume"),
            })

        return enriched

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    async def _find_item(
        self,
        user_id: str,
        ticker: str,
        list_name: str,
    ) -> dict[str, Any] | None:
        async with async_session_factory() as session:
            result = await session.execute(
                __import__("sqlalchemy").text(
                    """
                    SELECT id, user_id, ticker, name, list_name, notes,
                           created_at
                    FROM watchlist_items
                    WHERE user_id = :user_id AND ticker = :ticker
                          AND list_name = :list_name
                    LIMIT 1
                    """
                ),
                {"user_id": user_id, "ticker": ticker, "list_name": list_name},
            )
            row = result.mappings().first()
            return dict(row) if row else None
