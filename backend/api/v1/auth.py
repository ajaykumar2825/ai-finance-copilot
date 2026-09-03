from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.ext.asyncio import AsyncSession

from backend.config import settings
from backend.database import get_async_session

router = APIRouter()


# ---------------------------------------------------------------------------
# Request / Response schemas
# ---------------------------------------------------------------------------


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(min_length=1, max_length=255)


class SignupResponse(BaseModel):
    id: str
    email: str
    full_name: str
    message: str = "Signup successful"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    refresh_token: str


class UserMeResponse(BaseModel):
    id: str
    email: str
    full_name: str | None = None
    avatar_url: str | None = None
    phone: str | None = None
    created_at: str
    app_metadata: dict = {}
    user_metadata: dict = {}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_supabase():
    """Return an async Supabase client using the anon key."""
    from supabase import acreate_client  # type: ignore[import-untyped]

    return await acreate_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)


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
    """Register a new user with email and password via Supabase Auth."""
    client = await _get_supabase()

    try:
        response = await client.auth.sign_up(
            {
                "email": body.email,
                "password": body.password,
                "options": {"data": {"full_name": body.full_name}},
            }
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Signup failed: {exc}",
        )

    if response.user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Signup failed. The email may already be registered.",
        )

    return SignupResponse(
        id=response.user.id,
        email=response.user.email or body.email,
        full_name=body.full_name,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and obtain JWT tokens",
)
async def login(body: LoginRequest) -> TokenResponse:
    """Authenticate with email and password and return access + refresh tokens."""
    client = await _get_supabase()

    try:
        response = await client.auth.sign_in_with_password(
            {"email": body.email, "password": body.password}
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if response.session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return TokenResponse(
        access_token=response.session.access_token,
        refresh_token=response.session.refresh_token,
        expires_in=response.session.expires_in,
    )


@router.post(
    "/login/form",
    response_model=TokenResponse,
    summary="Authenticate via OAuth2 form (for Swagger UI)",
    include_in_schema=False,
)
async def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> TokenResponse:
    """OAuth2-compatible login so the Swagger UI Authorize button works."""
    client = await _get_supabase()

    try:
        response = await client.auth.sign_in_with_password(
            {"email": form_data.username, "password": form_data.password}
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if response.session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return TokenResponse(
        access_token=response.session.access_token,
        refresh_token=response.session.refresh_token,
        expires_in=response.session.expires_in,
    )


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Sign out and invalidate the session",
)
async def logout(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> None:
    """Sign out the current user by revoking the refresh token.

    Expects the ``Authorization: Bearer <access_token>`` header.
    """
    from backend.dependencies import get_current_user

    current_user = await get_current_user(request, db)

    client = await _get_supabase()

    # supabase-py sign_out revokes the current session
    try:
        await client.auth.sign_out()
    except Exception:
        # Even if Supabase sign-out fails we still return 204
        pass


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh an expired access token",
)
async def refresh_token(body: RefreshRequest) -> TokenResponse:
    """Exchange a valid refresh token for a new access + refresh token pair."""
    client = await _get_supabase()

    try:
        response = await client.auth.refresh_session(body.refresh_token)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token refresh failed: {exc}",
        )

    if response.session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    return TokenResponse(
        access_token=response.session.access_token,
        refresh_token=response.session.refresh_token,
        expires_in=response.session.expires_in,
    )


@router.get(
    "/me",
    response_model=UserMeResponse,
    summary="Get the current authenticated user",
)
async def get_me(
    request: Request,
    db: AsyncSession = Depends(get_async_session),
) -> UserMeResponse:
    """Return the profile of the currently authenticated user.

    Requires a valid ``Authorization: Bearer <access_token>`` header.
    """
    from backend.dependencies import get_current_user

    current_user = await get_current_user(request, db)

    # get_current_user already returns the user dict from Supabase
    user_data: dict = current_user

    return UserMeResponse(
        id=user_data.get("id", ""),
        email=user_data.get("email", ""),
        full_name=user_data.get("user_metadata", {}).get("full_name"),
        avatar_url=user_data.get("user_metadata", {}).get("avatar_url"),
        phone=user_data.get("phone"),
        created_at=user_data.get("created_at", ""),
        app_metadata=user_data.get("app_metadata", {}),
        user_metadata=user_data.get("user_metadata", {}),
    )
