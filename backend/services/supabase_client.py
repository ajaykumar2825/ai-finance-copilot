from __future__ import annotations

from supabase import Client, create_client

from backend.config import settings

_client: Client | None = None
_service_client: Client | None = None


def get_client() -> Client:
    """Return a Supabase client using the anon key (respects RLS)."""
    global _client
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    return _client


def get_service_client() -> Client:
    """Return a Supabase client using the service-role key (bypasses RLS)."""
    global _service_client
    if _service_client is None:
        _service_client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _service_client


def reset_clients() -> None:
    """Reset cached clients (useful in tests)."""
    global _client, _service_client
    _client = None
    _service_client = None
