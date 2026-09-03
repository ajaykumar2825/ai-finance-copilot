from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class DocumentUpload(BaseModel):
    filename: str
    file_type: str
    file_size: int
    storage_path: str


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    filename: str
    file_type: str
    file_size: int
    storage_path: str
    status: str
    chunk_count: int
    metadata_: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime
