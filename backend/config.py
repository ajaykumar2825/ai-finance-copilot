from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    DATABASE_URL: str
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    ANTHROPIC_API_KEY: str = ""
    EMBEDDING_PROVIDER: str = "openai"
    LLM_PROVIDER: str = "openai"
    LLM_MODEL: str = "gpt-4o"
    JWT_SECRET: str
    JWT_REFRESH_SECRET: str
    CORS_ORIGINS: str = "http://localhost:3000"
    STORAGE_BUCKET: str = "documents"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
