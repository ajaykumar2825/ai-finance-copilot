from __future__ import annotations

import logging
import traceback
from typing import Any

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import Response
from pydantic import BaseModel, EmailStr, Field

from backend.config import settings
from backend.services.auth_service import AuthService

logger = logging.getLogger(__name__)

router = APIRouter()

_service = AuthService()


# ---------------------------------------------------------------------------
# Request / Response schemas (match the frontend contract exactly)
# ---------------------------------------------------------------------------


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    fullName: str | None = Field(default=None, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class User(BaseModel):
    id: str
    email: str
    fullName: str | None = None
    avatarUrl: str | None = None
    subscriptionTier: str = "free"
    createdAt: str = ""


class AuthResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: User


class SignupResponse(BaseModel):
    access_token: str | None = None
    refresh_token: str | None = None
    user: User | None = None
    needs_email_confirmation: bool = False
    message: str | None = None


class RefreshRequest(BaseModel):
    refresh_token: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _to_user(payload: dict[str, Any]) -> User:
    created_at = payload.get("created_at", "") or ""
    if hasattr(created_at, "isoformat"):
        created_at = created_at.isoformat()
    return User(
        id=payload.get("id", ""),
        email=str(payload.get("email", "") or ""),
        fullName=payload.get("full_name"),
        avatarUrl=payload.get("avatar_url") or None,
        subscriptionTier="free",
        createdAt=created_at,
    )


def _auth_response(payload: dict[str, Any]) -> AuthResponse:
    return AuthResponse(
        access_token=payload["access_token"],
        refresh_token=payload["refresh_token"],
        user=_to_user(payload.get("user", {})),
    )


def _map_auth_error(exc: Exception, *, login: bool = False, extra: str = "") -> HTTPException:
    """Translate a Supabase/gotrue error into a FastAPI HTTPException.

    Logs the full traceback and surfaces the actual error message instead of a
    generic 500 whenever the details are known and safe to return.
    """
    logger.error("Supabase auth error (%s): %s", extra or "unknown", exc)
    logger.error("Traceback:\n%s", traceback.format_exc())

    status_code = getattr(exc, "status", None)
    message = str(getattr(exc, "message", "") or exc)

    if login and (status_code == 400 or "invalid" in message.lower()):
        return HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if "already been registered" in message or "already exists" in message.lower():
        return HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    if "rate limit" in message.lower():
        return HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=message,
        )

    if status_code is not None and isinstance(status_code, int):
        return HTTPException(status_code=status_code, detail=message)

    return HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=message)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "/signup",
    response_model=SignupResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def signup(body: SignupRequest) -> SignupResponse:
    """Register a new user with Supabase Auth.

    Instrumented for diagnostics: logs the incoming email, whether the Supabase
    client initialized, and the raw ``sign_up`` outcome. Returns the real error
    message on failure instead of a generic 500.
    """
    email = body.email.lower()
    full_name = (body.full_name or body.fullName or "").strip() or ""
    logger.info("signup attempt for email=%s full_name=%r", email, full_name)

    try:
        from backend.services.supabase_client import get_async_client

        await get_async_client()
        logger.info("Supabase client initialized for email=%s (url=%s)", email, settings.SUPABASE_URL)
    except Exception as exc:
        logger.error("Supabase client failed to initialize for email=%s", email, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Supabase client initialization failed: {exc}",
        )

    try:
        payload = await _service.signup(email, body.password, full_name)
        logger.info(
            "signup response for email=%s needs_email_confirmation=%s user_id=%s",
            email,
            payload.get("needs_email_confirmation"),
            payload.get("user", {}).get("id"),
        )
    except Exception as exc:
        logger.error("signup call failed for email=%s", email, exc_info=True)
        raise _map_auth_error(exc, extra=f"signup:{email}")

    if payload.get("needs_email_confirmation"):
        return SignupResponse(
            access_token=None,
            refresh_token=None,
            user=_to_user(payload.get("user", {})) if payload.get("user") else None,
            needs_email_confirmation=True,
            message="Account created. Please confirm your email before signing in.",
        )

    user = _to_user(payload.get("user", {}))
    return SignupResponse(
        access_token=payload.get("access_token"),
        refresh_token=payload.get("refresh_token"),
        user=user,
        needs_email_confirmation=False,
        message=None,
    )


@router.post("/signin", response_model=AuthResponse, summary="Authenticate and obtain JWT tokens")
async def signin(body: LoginRequest) -> AuthResponse:
    """Frontend-facing login endpoint (path + shape match the frontend)."""
    return await _login(body)


@router.post("/login", response_model=AuthResponse, summary="Authenticate and obtain JWT tokens")
async def login(body: LoginRequest) -> AuthResponse:
    """Authenticate with email + password (alias used by Swagger/legacy callers)."""
    return await _login(body)


async def _login(body: LoginRequest) -> AuthResponse:
    try:
        payload = await _service.login(body.email.lower(), body.password)
    except Exception as exc:
        raise _map_auth_error(exc, login=True)
    return _auth_response(payload)


@router.post("/signout", status_code=status.HTTP_204_NO_CONTENT, summary="Sign out")
async def signout(request: Request) -> Response:
    """Sign the current user out of Supabase (revokes the refresh token)."""
    try:
        await _service.logout()
    except Exception:
        # Logout is best-effort; the client clears local state regardless.
        pass
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Sign out")
async def logout(request: Request) -> Response:
    """Alias of signout (legacy callers)."""
    return await signout(request)


@router.post("/refresh", response_model=AuthResponse, summary="Refresh an expired access token")
async def refresh_token(body: RefreshRequest) -> AuthResponse:
    """Exchange a valid refresh token for a new access + refresh token pair."""
    try:
        payload = await _service.refresh_token(body.refresh_token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=getattr(exc, "message", "Invalid refresh token"),
        )
    return _auth_response(payload)


@router.get("/profile", response_model=User, summary="Get the current authenticated user")
async def get_profile(request: Request) -> User:
    """Return the profile of the currently authenticated user (camelCase, frontend contract)."""
    token = _extract_bearer(request)
    try:
        payload = await _service.get_user(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return _to_user(payload)


def _extract_bearer(request: Request) -> str:
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    return header.removeprefix("Bearer ").strip()
