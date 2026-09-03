from __future__ import annotations

import hashlib
import hmac
import secrets
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import Response
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database import get_async_session

router = APIRouter()

ACCESS_TOKEN_TTL = timedelta(hours=1)
REFRESH_TOKEN_TTL = timedelta(days=30)
_PBKDF2_ITERATIONS = 260_000


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


class RefreshRequest(BaseModel):
    refresh_token: str


# ---------------------------------------------------------------------------
# Password helpers (PBKDF2-HMAC-SHA256, stored as pbkdf2$iter$salt$hash)
# ---------------------------------------------------------------------------


def _hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), _PBKDF2_ITERATIONS
    )
    return f"pbkdf2_sha256${_PBKDF2_ITERATIONS}${salt}${digest.hex()}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        algo, iterations, salt, expected = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt), int(iterations)
        )
        return hmac.compare_digest(digest.hex(), expected)
    except Exception:
        return False


# ---------------------------------------------------------------------------
# JWT helpers (local, offline auth — no Supabase required)
# ---------------------------------------------------------------------------


def _issue_access_token(user_id: str, email: str, full_name: str | None) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "email": email,
        "user_metadata": {"full_name": full_name or ""},
        "aud": "authenticated",
        "iat": now,
        "exp": now + ACCESS_TOKEN_TTL,
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")


def _issue_refresh_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": user_id,
        "aud": "refresh",
        "iat": now,
        "exp": now + REFRESH_TOKEN_TTL,
    }
    return jwt.encode(payload, settings.JWT_REFRESH_SECRET, algorithm="HS256")


def _row_to_user(row) -> User:
    return User(
        id=str(row.id),
        email=row.email,
        fullName=getattr(row, "full_name", None),
        avatarUrl=getattr(row, "avatar_url", None) or None,
        subscriptionTier=getattr(row, "subscription_tier", None) or "free",
        createdAt=row.created_at.isoformat() if getattr(row, "created_at", None) else "",
    )


def _auth_response(row) -> AuthResponse:
    full_name = getattr(row, "full_name", None)
    return AuthResponse(
        access_token=_issue_access_token(str(row.id), row.email, full_name),
        refresh_token=_issue_refresh_token(str(row.id)),
        user=_row_to_user(row),
    )


async def _fetch_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(text("SELECT * FROM users WHERE email = :email"), {"email": email.lower()})
    return result.fetchone()


async def _fetch_user_by_id(db: AsyncSession, user_id: str):
    result = await db.execute(text("SELECT * FROM users WHERE id = :uid"), {"uid": user_id})
    return result.fetchone()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED, summary="Register a new user")
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_async_session)) -> AuthResponse:
    """Register a new user with email + password (local DB, offline)."""
    full_name = (body.full_name or body.fullName or "").strip() or None
    email = body.email.lower()

    existing = await _fetch_user_by_email(db, email)
    if existing is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with this email already exists")

    user_id = str(uuid.uuid4())
    pw_hash = _hash_password(body.password)
    await db.execute(
        text(
            """
            INSERT INTO users (id, email, full_name, password_hash, subscription_tier, settings, created_at, updated_at)
            VALUES (:id, :email, :name, :pw, 'free', '{}'::json, NOW(), NOW())
            """
        ),
        {"id": user_id, "email": email, "name": full_name, "pw": pw_hash},
    )
    await db.commit()

    row = await _fetch_user_by_id(db, user_id)
    return _auth_response(row)


@router.post("/signin", response_model=AuthResponse, summary="Authenticate and obtain JWT tokens")
async def signin(body: LoginRequest, db: AsyncSession = Depends(get_async_session)) -> AuthResponse:
    """Frontend-facing login endpoint (path + shape match the frontend)."""
    return await _login(body, db)


@router.post("/login", response_model=AuthResponse, summary="Authenticate and obtain JWT tokens")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_async_session)) -> AuthResponse:
    """Authenticate with email + password (alias used by Swagger/legacy callers)."""
    return await _login(body, db)


async def _login(body: LoginRequest, db: AsyncSession) -> AuthResponse:
    row = await _fetch_user_by_email(db, body.email.lower())
    if row is None or not _verify_password(body.password, row.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return _auth_response(row)


@router.post(
    "/login/form",
    response_model=AuthResponse,
    summary="Authenticate via OAuth2 form (for Swagger UI)",
    include_in_schema=False,
)
async def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_async_session),
) -> AuthResponse:
    row = await _fetch_user_by_email(db, form_data.username.lower())
    if row is None or not _verify_password(form_data.password, row.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    return _auth_response(row)


@router.post("/signout", status_code=status.HTTP_204_NO_CONTENT, summary="Sign out")
async def signout() -> Response:
    """Frontend-facing logout endpoint. Stateless JWT — no server state to clear."""
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT, summary="Sign out")
async def logout() -> Response:
    """Alias of signout (legacy callers)."""
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/refresh", response_model=AuthResponse, summary="Refresh an expired access token")
async def refresh_token(
    body: RefreshRequest,
    db: AsyncSession = Depends(get_async_session),
) -> AuthResponse:
    """Exchange a valid refresh token for a new access + refresh token pair (offline)."""
    try:
        payload = jwt.decode(
            body.refresh_token,
            settings.JWT_REFRESH_SECRET,
            algorithms=["HS256"],
            audience="refresh",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    row = await _fetch_user_by_id(db, payload.get("sub"))
    if row is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists")
    return _auth_response(row)


@router.get("/profile", response_model=User, summary="Get the current authenticated user")
async def get_profile(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> User:
    """Return the profile of the currently authenticated user (camelCase, frontend contract)."""
    from backend.dependencies import get_current_user

    current_user = await get_current_user(request, db)
    user_id = current_user.get("id", "")

    row = await _fetch_user_by_id(db, user_id)
    if row is not None:
        return _row_to_user(row)

    meta = current_user.get("user_metadata", {}) if isinstance(current_user, dict) else {}
    return User(
        id=user_id,
        email=current_user.get("email", ""),
        fullName=meta.get("full_name") or meta.get("fullName"),
        avatarUrl=meta.get("avatar_url") or meta.get("avatarUrl"),
        subscriptionTier="free",
        createdAt="",
    )
