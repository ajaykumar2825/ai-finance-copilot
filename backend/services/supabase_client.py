from __future__ import annotations

from typing import Any

from supabase import Client, create_client

from backend.config import settings

_sync_client: Client | None = None
_sync_service_client: Client | None = None
_async_client: Any | None = None
_async_service_client: Any | None = None


def get_client() -> Client:
    """Return a sync Supabase client using the anon key (respects RLS)."""
    global _sync_client
    if _sync_client is None:
        _sync_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return _sync_client


def get_service_client() -> Client:
    """Return a sync Supabase client using the service-role key (bypasses RLS)."""
    global _sync_service_client
    if _sync_service_client is None:
        _sync_service_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _sync_service_client


async def get_async_client() -> Any:
    """Return an async Supabase client using the anon key (respects RLS)."""
    global _async_client
    if _async_client is None:
        from supabase import acreate_client  # type: ignore[import-untyped]

        _async_client = await acreate_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return _async_client


async def get_async_service_client() -> Any:
    """Return an async Supabase client using the service-role key (bypasses RLS)."""
    global _async_service_client
    if _async_service_client is None:
        from supabase import acreate_client  # type: ignore[import-untyped]

        _async_service_client = await acreate_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _async_service_client


def reset_clients() -> None:
    """Reset cached clients (useful in tests)."""
    global _sync_client, _sync_service_client, _async_client, _async_service_client
    _sync_client = None
    _sync_service_client = None
    _async_client = None
    _async_service_client = None
