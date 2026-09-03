from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_async_session
from backend.dependencies import get_current_user

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class UserMeResponse(BaseModel):
    id: str
    email: str
    full_name: str | None = None
    avatar_url: str | None = None
    phone: str | None = None
    created_at: str
    user_metadata: dict = {}


class UserUpdateRequest(BaseModel):
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    avatar_url: str | None = None
    phone: str | None = None


class UserUpdateResponse(BaseModel):
    id: str
    email: str
    full_name: str | None = None
    avatar_url: str | None = None
    phone: str | None = None
    message: str = "Profile updated"


class UserDeleteResponse(BaseModel):
    message: str = "Account deleted"


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/me",
    response_model=UserMeResponse,
    summary="Get the current user's profile",
)
async def get_user_me(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> UserMeResponse:
    """Return the full profile of the authenticated user."""
    user = await get_current_user(request, db)

    meta = user.get("user_metadata", {}) if isinstance(user, dict) else {}
    return UserMeResponse(
        id=user.get("id", ""),
        email=user.get("email", ""),
        full_name=meta.get("full_name"),
        avatar_url=meta.get("avatar_url"),
        phone=user.get("phone"),
        created_at=user.get("created_at", ""),
        user_metadata=meta,
    )


@router.put(
    "/me",
    response_model=UserUpdateResponse,
    summary="Update the current user's profile",
)
async def update_user_me(
    body: UserUpdateRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> UserUpdateResponse:
    """Update profile fields for the authenticated user via Supabase Auth."""
    from supabase import acreate_client  # type: ignore[import-untyped]

    from backend.config import settings

    current_user = await get_current_user(request, db)

    update_data: dict = {}
    if body.full_name is not None:
        update_data["full_name"] = body.full_name
    if body.avatar_url is not None:
        update_data["avatar_url"] = body.avatar_url
    if body.phone is not None:
        update_data["phone"] = body.phone

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update",
        )

    client = await acreate_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

    try:
        await client.auth.update_user(update_data)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Update failed: {exc}",
        )

    return UserUpdateResponse(
        id=current_user.get("id", ""),
        email=current_user.get("email", ""),
        full_name=body.full_name or current_user.get("user_metadata", {}).get("full_name"),
        avatar_url=body.avatar_url or current_user.get("user_metadata", {}).get("avatar_url"),
        phone=body.phone or current_user.get("phone"),
    )


@router.delete(
    "/me",
    response_model=UserDeleteResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete the current user's account",
)
async def delete_user_me(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> UserDeleteResponse:
    """Permanently delete the authenticated user's account.

    This action cannot be undone. All associated data will be removed.
    """
    from supabase import acreate_client  # type: ignore[import-untyped]

    from backend.config import settings

    user = await get_current_user(request, db)
    user_id = user.get("id", "")

    # Use service-role key to delete users (admin action)
    admin_client = await acreate_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

    try:
        # First clean up user-owned data from our database
        from sqlalchemy import text

        async with db.begin_nested():
            await db.execute(text("DELETE FROM user_settings WHERE user_id = :uid"), {"uid": user_id})
            await db.execute(text("DELETE FROM watchlists WHERE user_id = :uid"), {"uid": user_id})
            await db.execute(text("DELETE FROM portfolio_assets WHERE user_id = :uid"), {"uid": user_id})
            await db.execute(
                text("DELETE FROM portfolio_transactions WHERE user_id = :uid"),
                {"uid": user_id},
            )
            await db.execute(text("DELETE FROM chats WHERE user_id = :uid"), {"uid": user_id})

        # Then delete the auth user
        await admin_client.auth.admin.delete_user(user_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Account deletion failed: {exc}",
        )

    return UserDeleteResponse()
