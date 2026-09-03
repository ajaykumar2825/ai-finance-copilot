"""Align portfolio / watchlist / news schema with frontend contract

Revision ID: 002
Revises: 001
Create Date: 2026-09-04 00:00:00.000000
"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # --- portfolio_assets: add updated_at (routers/frontend sort and return it)
    op.execute("ALTER TABLE portfolio_assets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()")

    # --- portfolio_transactions (frontend Transaction contract)
    if not bind.dialect.has_table(bind, "portfolio_transactions"):
        op.create_table(
            "portfolio_transactions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "asset_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("portfolio_assets.id", ondelete="SET NULL"),
                nullable=True,
            ),
            sa.Column("ticker", sa.String(20), nullable=False, index=True),
            sa.Column("type", sa.String(30), nullable=False),
            sa.Column("quantity", sa.Numeric(18, 6), nullable=False),
            sa.Column("price", sa.Numeric(18, 6), nullable=False),
            sa.Column("total", sa.Numeric(18, 6), nullable=False),
            sa.Column("fees", sa.Numeric(18, 6), nullable=False, server_default="0"),
            sa.Column("notes", sa.Text, nullable=True),
            sa.Column("executed_at", sa.DateTime, nullable=True),
            sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        )

    # --- watchlist (frontend WatchlistItem contract)
    if not bind.dialect.has_table(bind, "watchlist"):
        op.create_table(
            "watchlist",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "user_id",
                postgresql.UUID(as_uuid=True),
                sa.ForeignKey("users.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("ticker", sa.String(20), nullable=False, index=True),
            sa.Column("name", sa.String(255), nullable=True),
            sa.Column("notes", sa.Text, nullable=True),
            sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        )

    # --- news_cache (optional persistence for fetched news)
    if not bind.dialect.has_table(bind, "news_cache"):
        op.create_table(
            "news_cache",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("ticker", sa.String(20), nullable=True, index=True),
            sa.Column("title", sa.String(500), nullable=False),
            sa.Column("summary", sa.Text, nullable=True),
            sa.Column("sentiment", sa.String(20), nullable=True),
            sa.Column("source", sa.String(255), nullable=True),
            sa.Column("url", sa.Text, nullable=True),
            sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("cached_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        )

    op.execute("DROP INDEX IF EXISTS ix_portfolio_assets_user_id")
    op.execute("CREATE INDEX IF NOT EXISTS ix_portfolio_assets_user_id ON portfolio_assets (user_id)")


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.has_table(bind, "news_cache"):
        op.drop_table("news_cache")
    if bind.dialect.has_table(bind, "watchlist"):
        op.drop_table("watchlist")
    if bind.dialect.has_table(bind, "portfolio_transactions"):
        op.drop_table("portfolio_transactions")
    op.execute("ALTER TABLE portfolio_assets DROP COLUMN IF EXISTS updated_at")
