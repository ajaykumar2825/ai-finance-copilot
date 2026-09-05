from __future__ import annotations

from collections.abc import AsyncGenerator
from typing import Any

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_async_session
from backend.services.auth_service import AuthService

security = HTTPBearer()
_service = AuthService()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_async_session():
        yield session


async def _verify_token(token: str) -> dict[str, Any]:
    """Validate a Supabase JWT and return the authenticated user dict."""
    try:
        user = await _service.get_user(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user_id = user.get("id")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing user identifier",
        )

    user["id"] = user_id
    return user


async def get_current_user(
    request: Request | None = None,
    db: AsyncSession | None = None,
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict[str, Any]:
    if request is not None:
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing or invalid Authorization header",
            )
        token = auth_header.removeprefix("Bearer ").strip()
        return await _verify_token(token)

    return await _verify_token(credentials.credentials)
