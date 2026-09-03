from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class WatchlistCreate(BaseModel):
    ticker: str
    name: str
    notes: str | None = None


class WatchlistRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    ticker: str
    name: str
    notes: str | None
    created_at: datetime
