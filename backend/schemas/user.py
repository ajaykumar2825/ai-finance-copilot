from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str | None = None
    avatar_url: str | None = None
    subscription_tier: str = "free"
    settings: dict[str, Any] | None = None


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    email: str
    full_name: str | None
    avatar_url: str | None
    subscription_tier: str
    settings: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime


class UserUpdate(BaseModel):
    full_name: str | None = None
    avatar_url: str | None = None
    subscription_tier: str | None = None
    settings: dict[str, Any] | None = None
