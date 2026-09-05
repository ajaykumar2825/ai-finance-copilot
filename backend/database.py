from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from backend.config import settings


def _build_engine_url() -> tuple[object, dict]:
    """Return an (async engine URL, connect_args) pair compatible with asyncpg.

    The app defaults to Supabase's *session* pooler (``pgbouncer=false``, port
    5432), which passes prepared statements through normally. If a
    transaction-pooler URL (``pgbouncer=true``, port 6543) is configured, strip
    that flag (asyncpg rejects the unknown keyword) and disable asyncpg's
    prepared-statement cache, which PgBouncer in transaction mode cannot support.
    """
    url = make_url(settings.DATABASE_URL)
    connect_args: dict = {}
    query = dict(url.query.items())
    if "pgbouncer" in query:
        del query["pgbouncer"]
        connect_args["prepared_statement_cache_size"] = 0
        connect_args["statement_cache_size"] = 0
    url = url.set(query=query)
    return url, connect_args


_db_url, _connect_args = _build_engine_url()

engine = create_async_engine(
    _db_url,
    echo=False,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    connect_args=_connect_args,
)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
