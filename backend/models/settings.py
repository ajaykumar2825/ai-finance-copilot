from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base


class UserSetting(Base):
    __tablename__ = "user_settings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    theme: Mapped[str] = mapped_column(String(20), default="system", nullable=False)
    language: Mapped[str] = mapped_column(String(10), default="en", nullable=False)
    llm_provider: Mapped[str] = mapped_column(String(50), default="openai", nullable=False)
    embedding_provider: Mapped[str] = mapped_column(String(50), default="openai", nullable=False)
    notification_email: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    notification_market: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    api_key_openai: Mapped[str | None] = mapped_column(String(255), nullable=True)
    api_key_gemini: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow
    )
