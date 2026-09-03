from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ChatCreate(BaseModel):
    title: str = "New Chat"
    model_used: str | None = None


class ChatRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    title: str
    pinned: bool
    model_used: str | None
    created_at: datetime
    updated_at: datetime


class ChatUpdate(BaseModel):
    title: str | None = None
    pinned: bool | None = None
    model_used: str | None = None


class MessageCreate(BaseModel):
    content: str
    role: str = "user"
    citations: dict[str, Any] | None = None
    token_count: int | None = None


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    chat_id: UUID
    role: str
    content: str
    citations: dict[str, Any] | None
    token_count: int | None
    created_at: datetime
