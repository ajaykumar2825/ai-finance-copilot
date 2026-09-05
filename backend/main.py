from __future__ import annotations

import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from backend.api.v1.router import api_router
from backend.config import settings
from backend.middleware.auth import SupabaseJWTMiddleware
from backend.middleware.rate_limit import RateLimitMiddleware

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def _emit_banner(message: str) -> None:
    """Write the startup banner to stderr as UTF-8 bytes.

    Uses the underlying binary buffer so emoji characters survive redirects
    and legacy Windows console codepages.
    """
    payload = message.encode("utf-8")
    for stream in (sys.stderr, sys.stdout):
        buffer = getattr(stream, "buffer", None)
        if buffer is None:
            continue
        try:
            buffer.write(payload)
            buffer.flush()
            return
        except (AttributeError, ValueError, OSError):
            continue
    print(message, end="", file=sys.stderr, flush=True)


# The variables the app needs to boot and serve traffic. Missing values are
# reported at startup instead of crashing silently.
_REQUIRED_CONFIG = {
    "DATABASE_URL": "DATABASE_URL",
    "SUPABASE_URL": "SUPABASE_URL",
    "SUPABASE_ANON_KEY": "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY": "SUPABASE_SERVICE_ROLE_KEY",
    "JWT_SECRET": "JWT_SECRET",
    "JWT_REFRESH_SECRET": "JWT_REFRESH_SECRET",
}


def _missing_config() -> list[str]:
    """Return the names of required config vars that are empty."""
    return [label for label, key in _REQUIRED_CONFIG.items() if not getattr(settings, key, "")]


async def _database_status() -> str:
    """Best-effort connectivity check against the configured database engine."""
    from backend.database import engine

    try:
        async with asyncio.timeout(6):
            async with engine.connect() as conn:
                await conn.execute(text("SELECT 1"))
        return "Database Connected ✅"
    except Exception as exc:
        return f"Database Not Connected ❌ ({type(exc).__name__}: {str(exc)[:120]})"


async def _run_startup_diagnostics() -> None:
    """Print a startup banner with per-dependency status.

    Missing config is reported as a warning (never crashes startup); an
    unreachable database is reported but also tolerated so the app boots.
    """
    missing = _missing_config()

    lines = [
        "",
        "=" * 60,
        "  AI Finance Copilot Backend Started",
        "=" * 60,
        f"  Supabase URL Loaded {'✅' if settings.SUPABASE_URL else '❌'}",
        f"  {'  ' + await _database_status()}",
        f"  JWT Config Loaded {'✅' if settings.JWT_SECRET and settings.JWT_REFRESH_SECRET else '❌'}",
        f"  Environment: {settings.ENVIRONMENT}",
        "=" * 60,
    ]
    if missing:
        lines.append(f"  WARNING - missing: {', '.join(missing)}")
        lines.append("  Set them via .env or environment variables before deploying.")
        lines.append("=" * 60)

    message = "\n".join(lines) + "\n"
    _emit_banner(message)
    logger.info("Startup diagnostics completed (missing=%s)", missing)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    logger.info("Starting AI Finance Copilot backend...")
    await _run_startup_diagnostics()
    yield
    logger.info("Shutting down AI Finance Copilot backend...")


app = FastAPI(
    title="AI Finance Copilot",
    description="AI-powered personal finance assistant API",
    version="1.0.0",
    lifespan=lifespan,
)

# Middleware order matters in Starlette: the LAST add_middleware call becomes
# the OUTERMOST middleware (runs first). CORSMiddleware is registered last so it
# runs before routers and before the authentication/rate-limit middleware. This
# lets CORS answer OPTIONS preflight requests before any JWT check, and ensures
# the middleware stack always sees CORS headers even on auth failures.
app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)
app.add_middleware(SupabaseJWTMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes (mounted after middleware so CORS/auth order above is respected).
app.include_router(api_router)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled exception: %s", exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=404,
        content={"detail": "Resource not found"},
    )


@app.get("/health", tags=["health"])
async def health_check() -> dict[str, str]:
    return {"status": "healthy", "service": "ai-finance-copilot"}


def run() -> None:
    """Entry point for `python -m backend.main` (and `python -m backend`)."""
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000)


if __name__ == "__main__":
    run()
