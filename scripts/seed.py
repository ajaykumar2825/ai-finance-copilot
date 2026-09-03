#!/usr/bin/env python3
"""Database seed script for AI Finance Copilot.

Creates sample users, portfolio assets, watchlist items, and settings
for local development. Reads DATABASE_URL from the environment or .env file.

Usage:
    python scripts/seed.py
"""

from __future__ import annotations

import asyncio
import os
import sys
from datetime import datetime, timezone
from uuid import uuid4

from dotenv import load_dotenv

load_dotenv()

SAMPLE_USER_ID = uuid4()
SAMPLE_EMAIL = "demo@aifinance.dev"
SAMPLE_FULL_NAME = "Demo User"

SAMPLE_ASSETS = [
    {
        "ticker": "AAPL",
        "name": "Apple Inc.",
        "quantity": 50,
        "avg_cost": 175.50,
        "sector": "Technology",
    },
    {
        "ticker": "MSFT",
        "name": "Microsoft Corporation",
        "quantity": 30,
        "avg_cost": 380.00,
        "sector": "Technology",
    },
    {
        "ticker": "GOOGL",
        "name": "Alphabet Inc.",
        "quantity": 20,
        "avg_cost": 140.25,
        "sector": "Communication Services",
    },
    {
        "ticker": "AMZN",
        "name": "Amazon.com Inc.",
        "quantity": 25,
        "avg_cost": 178.75,
        "sector": "Consumer Cyclical",
    },
    {
        "ticker": "NVDA",
        "name": "NVIDIA Corporation",
        "quantity": 40,
        "avg_cost": 490.00,
        "sector": "Technology",
    },
]

SAMPLE_WATCHLIST = [
    {"ticker": "TSLA", "name": "Tesla Inc."},
    {"ticker": "META", "name": "Meta Platforms Inc."},
    {"ticker": "JPM", "name": "JPMorgan Chase & Co."},
    {"ticker": "V", "name": "Visa Inc."},
]


async def seed() -> None:
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        print("ERROR: DATABASE_URL environment variable is not set.")
        print("Set it in your .env file or export it before running.")
        sys.exit(1)

    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

    engine = create_async_engine(database_url, echo=False)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    print(f"Connecting to database...")
    async with session_factory() as session:
        try:
            await session.execute(
                __import__("sqlalchemy").text("SELECT 1")
            )
            print("Database connection successful.\n")
        except Exception as e:
            print(f"ERROR: Could not connect to database: {e}")
            sys.exit(1)

        # ── Seed user ────────────────────────────────────────────────────────
        print("Seeding user...")
        from sqlalchemy import text

        existing = await session.execute(
            text("SELECT id FROM users WHERE email = :email"),
            {"email": SAMPLE_EMAIL},
        )
        if existing.fetchone():
            print(f"  User {SAMPLE_EMAIL} already exists — skipping.")
            row = await session.execute(
                text("SELECT id FROM users WHERE email = :email"),
                {"email": SAMPLE_EMAIL},
            )
            user_id = row.fetchone()[0]
        else:
            await session.execute(
                text(
                    """
                    INSERT INTO users (id, email, full_name, subscription_tier, created_at, updated_at)
                    VALUES (:id, :email, :name, 'free', :now, :now)
                    """
                ),
                {
                    "id": SAMPLE_USER_ID,
                    "email": SAMPLE_EMAIL,
                    "name": SAMPLE_FULL_NAME,
                    "now": datetime.now(timezone.utc),
                },
            )
            user_id = SAMPLE_USER_ID
            print(f"  Created user: {SAMPLE_EMAIL} (id={user_id})")

        # ── Seed user settings ──────────────────────────────────────────────
        print("Seeding user settings...")
        existing_settings = await session.execute(
            text("SELECT id FROM user_settings WHERE user_id = :uid"),
            {"uid": user_id},
        )
        if not existing_settings.fetchone():
            await session.execute(
                text(
                    """
                    INSERT INTO user_settings
                        (id, user_id, theme, language, llm_provider, embedding_provider,
                         notification_email, notification_market, created_at, updated_at)
                    VALUES (:id, :uid, 'dark', 'en', 'openai', 'openai',
                            true, true, :now, :now)
                    """
                ),
                {
                    "id": uuid4(),
                    "uid": user_id,
                    "now": datetime.now(timezone.utc),
                },
            )
            print("  Created default settings (dark theme)")
        else:
            print("  Settings already exist — skipping.")

        # ── Seed portfolio assets ───────────────────────────────────────────
        print("Seeding portfolio assets...")
        existing_assets = await session.execute(
            text("SELECT COUNT(*) FROM portfolio_assets WHERE user_id = :uid"),
            {"uid": user_id},
        )
        count = existing_assets.scalar() or 0
        if count > 0:
            print(f"  User already has {count} assets — skipping.")
        else:
            now = datetime.now(timezone.utc)
            for asset in SAMPLE_ASSETS:
                await session.execute(
                    text(
                        """
                        INSERT INTO portfolio_assets
                            (id, user_id, ticker, name, quantity, avg_cost, sector, created_at)
                        VALUES (:id, :uid, :ticker, :name, :qty, :avg, :sector, :now)
                        """
                    ),
                    {
                        "id": uuid4(),
                        "uid": user_id,
                        "ticker": asset["ticker"],
                        "name": asset["name"],
                        "qty": asset["quantity"],
                        "avg": asset["avg_cost"],
                        "sector": asset["sector"],
                        "now": now,
                    },
                )
            print(f"  Created {len(SAMPLE_ASSETS)} portfolio assets")

        # ── Seed watchlist ──────────────────────────────────────────────────
        print("Seeding watchlist...")
        existing_watchlist = await session.execute(
            text("SELECT COUNT(*) FROM watchlist_items WHERE user_id = :uid"),
            {"uid": user_id},
        )
        wl_count = existing_watchlist.scalar() or 0
        if wl_count > 0:
            print(f"  User already has {wl_count} watchlist items — skipping.")
        else:
            now = datetime.now(timezone.utc)
            for item in SAMPLE_WATCHLIST:
                await session.execute(
                    text(
                        """
                        INSERT INTO watchlist_items (id, user_id, ticker, name, created_at)
                        VALUES (:id, :uid, :ticker, :name, :now)
                        """
                    ),
                    {
                        "id": uuid4(),
                        "uid": user_id,
                        "ticker": item["ticker"],
                        "name": item["name"],
                        "now": now,
                    },
                )
            print(f"  Created {len(SAMPLE_WATCHLIST)} watchlist items")

        await session.commit()

    await engine.dispose()
    print("\nSeeding complete!")


if __name__ == "__main__":
    asyncio.run(seed())
