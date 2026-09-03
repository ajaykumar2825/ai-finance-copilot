from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_async_session
from backend.dependencies import get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class SettingsResponse(BaseModel):
    weekly_report_enabled: bool = True
    price_alerts_enabled: bool = True
    sentiment_notifications_enabled: bool = False
    theme: str = Field(default="light", pattern=r"^(light|dark|system)$")
    default_currency: str = Field(default="USD", max_length=3)
    language: str = Field(default="en", max_length=5)
    notification_email: str | None = None
    timezone: str = Field(default="UTC", max_length=64)


class SettingsUpdateRequest(BaseModel):
    weekly_report_enabled: bool | None = None
    price_alerts_enabled: bool | None = None
    sentiment_notifications_enabled: bool | None = None
    theme: str | None = Field(default=None, pattern=r"^(light|dark|system)$")
    default_currency: str | None = Field(default=None, max_length=3)
    language: str | None = Field(default=None, max_length=5)
    notification_email: str | None = None
    timezone: str | None = Field(default=None, max_length=64)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "",
    response_model=SettingsResponse,
    summary="Get the current user's settings",
)
async def get_settings(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> SettingsResponse:
    """Return the authenticated user's application preferences and settings."""
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    result = await db.execute(
        text(
            """
            SELECT weekly_report_enabled, price_alerts_enabled, sentiment_notifications_enabled,
                   theme, default_currency, language, notification_email, timezone
            FROM user_settings
            WHERE user_id = :uid
            """
        ),
        {"uid": user_id},
    )
    row = result.fetchone()

    if row is None:
        return SettingsResponse()

    return SettingsResponse(
        weekly_report_enabled=bool(row.weekly_report_enabled),
        price_alerts_enabled=bool(row.price_alerts_enabled),
        sentiment_notifications_enabled=bool(row.sentiment_notifications_enabled),
        theme=row.theme,
        default_currency=row.default_currency,
        language=row.language,
        notification_email=row.notification_email,
        timezone=row.timezone,
    )


@router.put(
    "",
    response_model=SettingsResponse,
    summary="Update the current user's settings",
)
async def update_settings(
    body: SettingsUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> SettingsResponse:
    """Update application settings for the authenticated user.

    If the user has no settings row yet, one will be created with defaults
    merged with the provided updates.
    """
    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    # Check if a settings row exists
    check = await db.execute(
        text("SELECT id FROM user_settings WHERE user_id = :uid"),
        {"uid": user_id},
    )
    exists = check.fetchone() is not None

    if exists:
        updates: list[str] = ["updated_at = NOW()"]
        params: dict = {"uid": user_id}

        if body.weekly_report_enabled is not None:
            updates.append("weekly_report_enabled = :weekly")
            params["weekly"] = body.weekly_report_enabled
        if body.price_alerts_enabled is not None:
            updates.append("price_alerts_enabled = :alerts")
            params["alerts"] = body.price_alerts_enabled
        if body.sentiment_notifications_enabled is not None:
            updates.append("sentiment_notifications_enabled = :sentiment")
            params["sentiment"] = body.sentiment_notifications_enabled
        if body.theme is not None:
            updates.append("theme = :theme")
            params["theme"] = body.theme
        if body.default_currency is not None:
            updates.append("default_currency = :currency")
            params["currency"] = body.default_currency.upper()
        if body.language is not None:
            updates.append("language = :language")
            params["language"] = body.language
        if body.notification_email is not None:
            updates.append("notification_email = :email")
            params["email"] = body.notification_email
        if body.timezone is not None:
            updates.append("timezone = :tz")
            params["tz"] = body.timezone

        set_clause = ", ".join(updates)
        await db.execute(
            text(f"UPDATE user_settings SET {set_clause} WHERE user_id = :uid"),
            params,
        )
    else:
        # Create a new settings row with defaults + updates
        from sqlalchemy import text as _text

        await db.execute(
            _text(
                """
                INSERT INTO user_settings
                    (user_id, weekly_report_enabled, price_alerts_enabled,
                     sentiment_notifications_enabled, theme, default_currency,
                     language, notification_email, timezone, created_at, updated_at)
                VALUES
                    (:uid, :weekly, :alerts, :sentiment, :theme, :currency,
                     :language, :email, :tz, NOW(), NOW())
                """
            ),
            {
                "uid": user_id,
                "weekly": body.weekly_report_enabled if body.weekly_report_enabled is not None else True,
                "alerts": body.price_alerts_enabled if body.price_alerts_enabled is not None else True,
                "sentiment": body.sentiment_notifications_enabled
                if body.sentiment_notifications_enabled is not None
                else False,
                "theme": body.theme if body.theme else "light",
                "currency": (body.default_currency or "USD").upper(),
                "language": body.language if body.language else "en",
                "email": body.notification_email if body.notification_email is not None else None,
                "tz": body.timezone if body.timezone else "UTC",
            },
        )

    # Fetch the updated settings
    result = await db.execute(
        text(
            """
            SELECT weekly_report_enabled, price_alerts_enabled, sentiment_notifications_enabled,
                   theme, default_currency, language, notification_email, timezone
            FROM user_settings
            WHERE user_id = :uid
            """
        ),
        {"uid": user_id},
    )
    row = result.fetchone()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve settings after update",
        )

    return SettingsResponse(
        weekly_report_enabled=bool(row.weekly_report_enabled),
        price_alerts_enabled=bool(row.price_alerts_enabled),
        sentiment_notifications_enabled=bool(row.sentiment_notifications_enabled),
        theme=row.theme,
        default_currency=row.default_currency,
        language=row.language,
        notification_email=row.notification_email,
        timezone=row.timezone,
    )
