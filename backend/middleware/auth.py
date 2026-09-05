from __future__ import annotations

from collections.abc import Callable
from typing import Any

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from backend.services.auth_service import AuthService

# Public paths that must NOT require a JWT. These are matched against the
# full request path. Public auth endpoints (signup/signin/login/signout/refresh)
# are listed both with and without the `/api/v1` prefix so they bypass the
# middleware regardless of how they are mounted. Protected routes
# (e.g. /auth/profile, /auth/me, /portfolio/*, /watchlist/*, ...) are NOT here
# and therefore still require a valid Authorization header.
PUBLIC_AUTH = (
    "/api/v1/auth/signup",
    "/api/v1/auth/signin",
    "/api/v1/auth/login",
    "/api/v1/auth/signout",
    "/api/v1/auth/logout",
    "/api/v1/auth/refresh",
    "/auth/signup",
    "/auth/signin",
    "/auth/login",
    "/auth/signout",
    "/auth/logout",
    "/auth/refresh",
)

UNAUTHENTICATED_PATHS = {
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    "/api/v1/health",
    *PUBLIC_AUTH,
}
UNAUTHENTICATED_PREFIXES = (
    "/health",
    "/docs",
    "/openapi",
    "/redoc",
    "/api/v1/health",
    *PUBLIC_AUTH,
)


class SupabaseJWTMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: Any) -> None:
        super().__init__(app)
        self._auth_service = AuthService()

    async def dispatch(self, request: Request, call_next: Callable[..., Any]) -> Response:
        # Browsers issue CORS preflight OPTIONS requests before real requests.
        # Do NOT require auth for OPTIONS - pass through so CORSMiddleware can
        # answer the preflight with the correct Access-Control-* headers.
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path

        if path in UNAUTHENTICATED_PATHS or path.startswith(UNAUTHENTICATED_PREFIXES):
            return await call_next(request)

        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing or invalid Authorization header"},
            )

        token = auth_header.removeprefix("Bearer ").strip()

        try:
            user = await self._auth_service.get_user(token)
        except Exception:
            return JSONResponse(status_code=401, content={"detail": "Invalid or expired token"})

        request.state.user = user
        request.state.user_id = user.get("id")
        return await call_next(request)
