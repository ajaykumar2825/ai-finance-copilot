from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class NewsRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    ticker: str | None
    title: str
    summary: str | None
    sentiment: str | None
    source: str | None
    url: str | None
    published_at: datetime | None
    cached_at: datetime


class NewsFilter(BaseModel):
    ticker: str | None = None
    sentiment: str | None = None
    source: str | None = None
    limit: int = 20
    offset: int = 0
