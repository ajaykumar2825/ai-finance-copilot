from __future__ import annotations

from collections.abc import Callable
from typing import Any

import jwt
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from backend.config import settings

UNAUTHENTICATED_PATHS = {"/health", "/docs", "/openapi.json", "/redoc"}
UNAUTHENTICATED_PREFIXES = ("/health", "/docs", "/openapi", "/redoc")


class SupabaseJWTMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next: Callable[..., Any]) -> Response:
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
