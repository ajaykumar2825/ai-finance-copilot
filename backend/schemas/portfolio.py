from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class PortfolioAssetCreate(BaseModel):
    ticker: str
    name: str
    quantity: Decimal = Decimal("0")
    avg_cost: Decimal = Decimal("0")
    sector: str | None = None


class PortfolioAssetRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    ticker: str
    name: str
    quantity: Decimal
    avg_cost: Decimal
    sector: str | None
    created_at: datetime


class TransactionCreate(BaseModel):
    asset_id: UUID | None = None
    ticker: str
    type: str
    quantity: Decimal
    price: Decimal
    total: Decimal
    notes: str | None = None


class TransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    user_id: UUID
    asset_id: UUID | None
    ticker: str
    type: str
    quantity: Decimal
    price: Decimal
    total: Decimal
    notes: str | None
    created_at: datetime
