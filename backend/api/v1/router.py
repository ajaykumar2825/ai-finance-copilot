from __future__ import annotations

from fastapi import APIRouter

from backend.api.v1.auth import router as auth_router
from backend.api.v1.chats import router as chats_router
from backend.api.v1.companies import router as companies_router
from backend.api.v1.documents import router as documents_router
from backend.api.v1.health import router as health_router
from backend.api.v1.news import router as news_router
from backend.api.v1.portfolio import router as portfolio_router
from backend.api.v1.settings import router as settings_router
from backend.api.v1.users import router as users_router
from backend.api.v1.watchlist import router as watchlist_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(health_router, tags=["Health"])
api_router.include_router(auth_router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users_router, prefix="/users", tags=["Users"])
api_router.include_router(chats_router, prefix="/chats", tags=["Chats"])
api_router.include_router(documents_router, prefix="/documents", tags=["Documents"])
api_router.include_router(portfolio_router, prefix="/portfolio", tags=["Portfolio"])
api_router.include_router(companies_router, prefix="/companies", tags=["Companies"])
api_router.include_router(news_router, prefix="/news", tags=["News"])
api_router.include_router(watchlist_router, prefix="/watchlist", tags=["Watchlist"])
api_router.include_router(settings_router, prefix="/settings", tags=["Settings"])
