from __future__ import annotations

import os
import sys
from pathlib import Path

from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

# Resolve .env relative to *this file*, not the working directory, so the app
# starts correctly from any CWD (dev, Docker, Render).
_BACKEND_DIR = Path(__file__).resolve().parent
_ENV_FILE = _BACKEND_DIR / ".env"
_ENV_EXAMPLE = _BACKEND_DIR / ".env.example"

# The set of fields that must be present for the app to boot.
_REQUIRED_FIELDS = (
    "DATABASE_URL",
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "JWT_SECRET",
    "JWT_REFRESH_SECRET",
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Required (no defaults) ────────────────────────────────────────────────
    DATABASE_URL: str
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    JWT_SECRET: str
    JWT_REFRESH_SECRET: str

    # ── Optional with sensible dev defaults ───────────────────────────────────
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    EMBEDDING_PROVIDER: str = "openai"
    LLM_PROVIDER: str = "openai"
    LLM_MODEL: str = "gpt-4o"
    CORS_ORIGINS: str = "http://localhost:3000"
    STORAGE_BUCKET: str = "documents"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


def _is_production_env() -> bool:
    """Detect a production-style environment so we never auto-create files there."""
    return (os.getenv("ENVIRONMENT") or "").lower() in {"production", "prod"}


def _ensure_local_env() -> None:
    """Developer convenience: scaffold a local `.env` from `.env.example`.

    Only runs when:
      - the local `.env` is absent,
      - a `.env.example` exists to copy from,
      - we are NOT in a production environment (production secrets are provided
        via the platform env vars, and we must never write files there).
    """
    if _ENV_FILE.exists() or not _ENV_EXAMPLE.exists():
        return
    if _is_production_env():
        return
    try:
        _ENV_FILE.write_text(_ENV_EXAMPLE.read_text(encoding="utf-8"), encoding="utf-8")
        sys.stderr.write(
            f"[config] Created {_ENV_FILE.name} from {_ENV_EXAMPLE.name} (development scaffold). Fill in real values.\n"
        )
    except OSError:
        # Never fail startup just because we could not scaffold a file.
        return


def _build_settings() -> Settings:
    """Build Settings with a clear, actionable error on failure."""
    _ensure_local_env()
    try:
        return Settings()
    except ValidationError as exc:
        missing = []
        for err in exc.errors():
            field = err.get("loc", (None,))[-1]
            if field is not None and field not in missing:
                missing.append(field)
        # Only surface the truly required fields to keep the message focused.
        missing = [f for f in _REQUIRED_FIELDS if f in missing] or missing

        msg_lines = [
            "",
            "=" * 60,
            "  Configuration error - required environment variables missing",
            "=" * 60,
            "",
            f"  Missing: {', '.join(missing)}",
            "",
            "  Fix one of:",
            f"    1. Copy {_ENV_EXAMPLE}  ->  {_ENV_FILE}",
            "       and fill in real values.",
            "    2. Export the variables in your shell / .env / CI secrets.",
            "",
            "=" * 60,
            "",
        ]
        sys.stderr.write("\n".join(msg_lines))
        raise SystemExit(1) from exc


settings = _build_settings()
