from __future__ import annotations

import logging
from typing import Any

from backend.services.supabase_client import get_async_client, get_async_service_client

logger = logging.getLogger(__name__)


class AuthService:
    """Thin wrapper around Supabase Auth helpers (async client)."""

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    async def signup(
        self,
        email: str,
        password: str,
        full_name: str = "",
    ) -> dict[str, Any]:
        """Register a new user with Supabase.

        Returns:
            Dict with ``access_token``, ``refresh_token``, ``user`` and
            ``needs_email_confirmation``. When the project has email
            confirmation enabled, ``access_token``/``refresh_token`` are
            ``None`` and ``needs_email_confirmation`` is ``True`` (the user is
            still created but must confirm their email before signing in).
        """
        client = await get_async_client()
        response = await client.auth.sign_up(
            {
                "email": email,
                "password": password,
                "options": {
                    "data": {"full_name": full_name},
                },
            }
        )

        user = self._user_dict(response.user) if getattr(response, "user", None) else {}

        if getattr(response, "session", None) is None:
            return {
                "access_token": None,
                "refresh_token": None,
                "user": user,
                "needs_email_confirmation": True,
            }

        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "user": user,
            "needs_email_confirmation": False,
        }

    async def login(
        self,
        email: str,
        password: str,
    ) -> dict[str, Any]:
        """Authenticate with email + password via Supabase."""
        client = await get_async_client()
        response = await client.auth.sign_in_with_password({"email": email, "password": password})

        if response.session is None:
            raise ValueError("Login failed: no session returned.")

        return self._user_payload(response)

    async def logout(self, access_token: str | None = None) -> None:
        """Sign out the current user (invalidates refresh token on server)."""
        client = await get_async_client()
        await client.auth.sign_out()
        logger.info("User logged out")

    async def refresh_token(self, refresh_token: str) -> dict[str, Any]:
        """Exchange a refresh token for a new access + refresh token pair."""
        client = await get_async_client()
        response = await client.auth.refresh_session(refresh_token)

        if response.session is None:
            raise ValueError("Token refresh failed: no session returned.")

        return self._user_payload(response)

    async def get_user(self, access_token: str) -> dict[str, Any]:
        """Retrieve the current user object from a valid access token.

        Raises:
            ValueError: if the token is invalid, expired, or the user is missing.

        Returns:
            User dict with ``id``, ``email``, ``full_name``, ``user_metadata``.
        """
        client = await get_async_client()
        response = await client.auth.get_user(access_token)

        if response.user is None:
            raise ValueError("Invalid or expired token: no user found.")

        return self._user_dict(response.user)

    async def admin_delete_user(self, user_id: str) -> None:
        """Permanently delete a user (service-role only)."""
        client = await get_async_service_client()
        await client.auth.admin.delete_user(user_id)
        logger.info("Admin deleted user %s", user_id)

    # ------------------------------------------------------------------
    # Payload helpers
    # ------------------------------------------------------------------

    def _user_payload(self, response: Any) -> dict[str, Any]:
        """Turn a Supabase AuthResponse into an access/refresh/user dict."""
        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "user": self._user_dict(response.user),
        }

    @staticmethod
    def _user_dict(user: Any) -> dict[str, Any]:
        metadata = getattr(user, "user_metadata", {}) or {}
        return {
            "id": user.id,
            "email": user.email,
            "full_name": metadata.get("full_name", ""),
            "avatar_url": metadata.get("avatar_url"),
            "user_metadata": metadata,
            "created_at": getattr(user, "created_at", "") or "",
        }
