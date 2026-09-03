"""Initial migration - create all tables

Revision ID: 001
Revises:
Create Date: 2025-01-01 00:00:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create custom ENUM types
    transaction_type = postgresql.ENUM("buy", "sell", "dividend", name="transaction_type", create_type=False)
    transaction_type.create(op.get_bind(), checkfirst=True)

    sentiment_type = postgresql.ENUM("positive", "negative", "neutral", name="sentiment_type", create_type=False)
    sentiment_type.create(op.get_bind(), checkfirst=True)

    document_status = postgresql.ENUM("processing", "ready", "error", name="document_status", create_type=False)
    document_status.create(op.get_bind(), checkfirst=True)

    message_role = postgresql.ENUM("user", "assistant", "system", name="message_role", create_type=False)
    message_role.create(op.get_bind(), checkfirst=True)

    # Enable pgvector extension
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, index=True, nullable=False),
        sa.Column("full_name", sa.String(255), nullable=True),
        sa.Column("avatar_url", sa.Text, nullable=True),
        sa.Column("subscription_tier", sa.String(50), nullable=False, server_default="free"),
        sa.Column("settings", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # --- user_settings ---
    op.create_table(
        "user_settings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("theme", sa.String(20), nullable=False, server_default="system"),
        sa.Column("language", sa.String(10), nullable=False, server_default="en"),
        sa.Column("llm_provider", sa.String(50), nullable=False, server_default="openai"),
        sa.Column("embedding_provider", sa.String(50), nullable=False, server_default="openai"),
        sa.Column("notification_email", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("notification_market", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("api_key_openai", sa.String(255), nullable=True),
        sa.Column("api_key_gemini", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # --- portfolio_assets ---
    op.create_table(
        "portfolio_assets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("ticker", sa.String(20), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("quantity", sa.Numeric(18, 6), nullable=False, server_default="0"),
        sa.Column("avg_cost", sa.Numeric(18, 6), nullable=False, server_default="0"),
        sa.Column("sector", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # --- transactions ---
    op.create_table(
        "transactions",
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
        sa.Column("type", transaction_type, nullable=False),
        sa.Column("quantity", sa.Numeric(18, 6), nullable=False),
        sa.Column("price", sa.Numeric(18, 6), nullable=False),
        sa.Column("total", sa.Numeric(18, 6), nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # --- watchlist_items ---
    op.create_table(
        "watchlist_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("ticker", sa.String(20), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # --- news_articles ---
    op.create_table(
        "news_articles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("ticker", sa.String(20), nullable=True, index=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("summary", sa.Text, nullable=True),
        sa.Column("sentiment", sentiment_type, nullable=True),
        sa.Column("source", sa.String(255), nullable=True),
        sa.Column("url", sa.Text, nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cached_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # --- documents ---
    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("file_type", sa.String(50), nullable=False),
        sa.Column("file_size", sa.BigInteger, nullable=False),
        sa.Column("storage_path", sa.Text, nullable=False),
        sa.Column("status", document_status, nullable=False, server_default="processing"),
        sa.Column("chunk_count", sa.Integer, nullable=False, server_default=sa.text("0")),
        sa.Column("metadata", sa.JSON, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # --- chats ---
    op.create_table(
        "chats",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("title", sa.String(500), nullable=False, server_default="New Chat"),
        sa.Column("pinned", sa.Boolean, nullable=False, server_default=sa.text("false")),
        sa.Column("model_used", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # --- messages ---
    op.create_table(
        "messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "chat_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("chats.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("role", message_role, nullable=False),
        sa.Column("content", sa.Text, nullable=False),
        sa.Column("citations", sa.JSON, nullable=True),
        sa.Column("token_count", sa.Integer, nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    # --- audit_logs ---
    op.create_table(
        "audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("resource_type", sa.String(100), nullable=False),
        sa.Column("resource_id", sa.String(255), nullable=True),
        sa.Column("details", sa.JSON, nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("created_at", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("audit_logs")
    op.drop_table("messages")
    op.drop_table("chats")
    op.drop_table("documents")
    op.drop_table("news_articles")
    op.drop_table("watchlist_items")
    op.drop_table("transactions")
    op.drop_table("portfolio_assets")
    op.drop_table("user_settings")
    op.drop_table("users")

    postgresql.ENUM(name="message_role").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="document_status").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="sentiment_type").drop(op.get_bind(), checkfirst=True)
    postgresql.ENUM(name="transaction_type").drop(op.get_bind(), checkfirst=True)
