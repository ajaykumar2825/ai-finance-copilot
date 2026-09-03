from __future__ import annotations

from backend.schemas.chat import ChatCreate, ChatRead, ChatUpdate, MessageCreate, MessageRead
from backend.schemas.common import ErrorResponse, PaginatedResponse, SuccessResponse
from backend.schemas.document import DocumentRead, DocumentUpload
from backend.schemas.news import NewsFilter, NewsRead
from backend.schemas.portfolio import (
    PortfolioAssetCreate,
    PortfolioAssetRead,
    TransactionCreate,
    TransactionRead,
)
from backend.schemas.settings import SettingsRead, SettingsUpdate
from backend.schemas.user import UserCreate, UserRead, UserUpdate
from backend.schemas.watchlist import WatchlistCreate, WatchlistRead

__all__ = [
    "ChatCreate",
    "ChatRead",
    "ChatUpdate",
    "DocumentRead",
    "DocumentUpload",
    "ErrorResponse",
    "MessageCreate",
    "MessageRead",
    "NewsFilter",
    "NewsRead",
    "PaginatedResponse",
    "PortfolioAssetCreate",
    "PortfolioAssetRead",
    "SettingsRead",
    "SettingsUpdate",
    "SuccessResponse",
    "TransactionCreate",
    "TransactionRead",
    "UserCreate",
    "UserRead",
    "UserUpdate",
    "WatchlistCreate",
    "WatchlistRead",
]
