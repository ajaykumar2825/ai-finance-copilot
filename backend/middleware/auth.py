from __future__ import annotations

from collections.abc import Callable
from typing import Any

import jwt
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from backend.config import settings

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
    "/api/v1/auth/login/form",
    "/api/v1/auth/signout",
    "/api/v1/auth/logout",
    "/api/v1/auth/refresh",
    "/auth/signup",
    "/auth/signin",
    "/auth/login",
    "/auth/login/form",
    "/auth/signout",
    "/auth/logout",
    "/auth/refresh",
)

UNAUTHENTICATED_PATHS = {
    "/health",
    "/docs",
    "/openapi.json",
    "/redoc",
    *PUBLIC_AUTH,
}
UNAUTHENTICATED_PREFIXES = (
    "/health",
    "/docs",
    "/openapi",
    "/redoc",
    *PUBLIC_AUTH,
)


class SupabaseJWTMiddleware(BaseHTTPMiddleware):
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
            payload = jwt.decode(
                token,
                settings.JWT_SECRET,
                algorithms=["HS256"],
                audience="authenticated",
            )
        except jwt.ExpiredSignatureError:
            return JSONResponse(status_code=401, content={"detail": "Token has expired"})
        except jwt.InvalidTokenError:
            return JSONResponse(status_code=401, content={"detail": "Invalid token"})

        request.state.user = payload
        request.state.user_id = payload.get("sub")
        return await call_next(request)
