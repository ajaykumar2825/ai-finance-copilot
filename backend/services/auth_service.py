from __future__ import annotations

import logging
from typing import Any

from backend.services.supabase_client import get_client, get_service_client

logger = logging.getLogger(__name__)


class AuthService:
    """Thin wrapper around Supabase Auth helpers."""

    def __init__(self) -> None:
        self._client = get_client()
        self._service_client = get_service_client()

    # ------------------------------------------------------------------
    # Public helpers
    # ------------------------------------------------------------------

    async def signup(
        self,
        email: str,
        password: str,
        full_name: str = "",
    ) -> dict[str, Any]:
        """Register a new user.

        Returns:
            Dict with ``access_token``, ``refresh_token``, ``user``.
        """
        response = self._client.auth.sign_up(
            {
                "email": email,
                "password": password,
                "options": {
                    "data": {"full_name": full_name},
                },
            }
        )

        if response.session is None:
            raise ValueError(
                "Signup succeeded but no session returned. " "Check email confirmation settings in Supabase."
            )

        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "user": {
                "id": response.user.id,
                "email": response.user.email,
                "full_name": response.user.user_metadata.get("full_name", ""),
            },
        }

    async def login(
        self,
        email: str,
        password: str,
    ) -> dict[str, Any]:
        """Authenticate with email + password.

        Returns:
            Dict with ``access_token``, ``refresh_token``, ``user``.
        """
        response = self._client.auth.sign_in_with_password({"email": email, "password": password})

        if response.session is None:
            raise ValueError("Login failed: no session returned.")

        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "user": {
                "id": response.user.id,
                "email": response.user.email,
                "full_name": response.user.user_metadata.get("full_name", ""),
            },
        }

    async def logout(self, access_token: str | None = None) -> None:
        """Sign out the current user (invalidates refresh token on server)."""
        if access_token:
            # Use the service client with an explicit user session
            self._service_client.auth.sign_out()
        else:
            self._client.auth.sign_out()
        logger.info("User logged out")

    async def refresh_token(self, refresh_token: str) -> dict[str, Any]:
        """Exchange a refresh token for a new access + refresh token pair.

        Returns:
            Dict with ``access_token``, ``refresh_token``.
        """
        response = self._client.auth.refresh_session(refresh_token)

        if response.session is None:
            raise ValueError("Token refresh failed: no session returned.")

        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "user": {
                "id": response.user.id,
                "email": response.user.email,
                "full_name": response.user.user_metadata.get("full_name", ""),
            },
        }

    async def get_user(self, access_token: str) -> dict[str, Any]:
        """Retrieve the current user object from a valid access token.

        Returns:
            User dict with ``id``, ``email``, ``full_name``.
        """
        response = self._client.auth.get_user(access_token)

        if response.user is None:
            raise ValueError("Invalid or expired token: no user found.")

        return {
            "id": response.user.id,
            "email": response.user.email,
            "full_name": response.user.user_metadata.get("full_name", ""),
        }

    async def admin_delete_user(self, user_id: str) -> None:
        """Permanently delete a user (service-role only)."""
        self._service_client.auth.admin.delete_user(user_id)
        logger.info("Admin deleted user %s", user_id)
