from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from backend.database import async_session_factory

logger = logging.getLogger(__name__)

DEFAULT_SETTINGS: dict[str, Any] = {
    "currency": "USD",
    "theme": "system",
    "llm_provider": "openai",
    "llm_model": "gpt-4o",
    "embedding_provider": "openai",
    "notifications_enabled": True,
    "risk_tolerance": "moderate",
}


class SettingsService:
    """Per-user application settings."""

    async def get_settings(self, user_id: str) -> dict[str, Any]:
        async with async_session_factory() as session:
            result = await session.execute(
                __import__("sqlalchemy").text(
                    """
                    SELECT settings_json, updated_at
                    FROM user_settings
                    WHERE user_id = :user_id
                    """
                ),
                {"user_id": user_id},
            )
            row = result.mappings().first()

            if row is None:
                return {**DEFAULT_SETTINGS}

            stored = json.loads(row["settings_json"])
            merged = {**DEFAULT_SETTINGS, **stored}
            merged["updated_at"] = row["updated_at"].isoformat() if hasattr(row["updated_at"], "isoformat") else str(row["updated_at"])
            return merged

    async def update_settings(
        self,
        user_id: str,
        updates: dict[str, Any],
    ) -> dict[str, Any]:
        current = await self.get_settings(user_id)
        # Remove metadata fields before merging
        current.pop("updated_at", None)
        merged = {**current, **updates}
        now = datetime.now(timezone.utc)
        settings_json = json.dumps(merged)

        async with async_session_factory() as session:
            await session.execute(
                __import__("sqlalchemy").text(
                    """
                    INSERT INTO user_settings (user_id, settings_json, created_at, updated_at)
                    VALUES (:user_id, :settings_json, :now, :now)
                    ON CONFLICT (user_id) DO UPDATE
                    SET settings_json = EXCLUDED.settings_json,
                        updated_at = EXCLUDED.updated_at
                    """
                ),
                {"user_id": user_id, "settings_json": settings_json, "now": now},
            )
            await session.commit()

        merged["updated_at"] = now.isoformat()
        return merged
