from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_async_session

router = APIRouter()


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------


class HealthStatus(BaseModel):
    status: str
    version: str = "1.0.0"
    service: str = "ai-finance-copilot"
    checks: list[dict] = []


class ReadyStatus(BaseModel):
    status: str
    components: dict = {}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get(
    "/health",
    response_model=HealthStatus,
    summary="Health check endpoint",
    tags=["Health"],
)
async def health() -> HealthStatus:
    """Return the basic health status of the API service.

    This endpoint performs no external checks and always returns ``ok``
    as long as the process is running.
    """
    return HealthStatus(status="ok")


@router.get(
    "/health/ready",
    response_model=ReadyStatus,
    summary="Readiness probe for the API",
    tags=["Health"],
)
async def health_ready(
    db: AsyncSession = Depends(get_async_session),
) -> ReadyStatus:
    """Indicate whether the service is ready to handle traffic.

    Verifies that the database connection is healthy.
    """
    components: dict = {"database": "unknown"}

    try:
        await db.execute(text("SELECT 1"))
        components["database"] = "ok"
    except Exception as exc:
        components["database"] = f"error: {exc}"
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "not_ready", "components": components},
        )

    return ReadyStatus(status="ready", components=components)


@router.get(
    "/health/live",
    response_model=ReadyStatus,
    summary="Liveness probe for the API",
    tags=["Health"],
)
async def health_live() -> ReadyStatus:
    """Indicate whether the process is alive.

    Returns ``ok`` with no external dependencies, used by orchestration
    systems to check that the process has not deadlocked.
    """
    return ReadyStatus(status="alive", components={"process": "ok"})
