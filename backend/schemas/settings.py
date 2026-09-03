from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class SettingsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    theme: str
    language: str
    llm_provider: str
    embedding_provider: str
    notification_email: bool
    notification_market: bool
    api_key_openai: str | None
    api_key_gemini: str | None
    created_at: datetime
    updated_at: datetime


class SettingsUpdate(BaseModel):
    theme: str | None = None
    language: str | None = None
    llm_provider: str | None = None
    embedding_provider: str | None = None
    notification_email: bool | None = None
    notification_market: bool | None = None
    api_key_openai: str | None = None
    api_key_gemini: str | None = None
