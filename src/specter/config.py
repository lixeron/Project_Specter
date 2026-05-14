"""Application configuration via environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Global application settings, loaded from environment / .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── App ──────────────────────────────────
    app_name: str = "specter"
    app_env: str = "development"
    debug: bool = True
    secret_key: str = "change-me-to-a-random-string-at-least-32-chars"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    base_url: str = "http://localhost:8000"

    # ── Database ─────────────────────────────
    database_url: str = "sqlite+aiosqlite:///./specter.db"

    # ── Redis ────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ── Auth ─────────────────────────────────
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # ── Logging ──────────────────────────────
    log_level: str = "INFO"
    log_format: str = "console"  # "console" or "json"

    # ── LLM (Phase 2) ───────────────────────
    llm_provider: str = "mock"
    openai_api_key: str | None = None
    anthropic_api_key: str | None = None
    ollama_base_url: str = "http://localhost:11434"

    # ── Email (Phase 2) ─────────────────────
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True

    # ── Tracking ─────────────────────────────
    @property
    def is_production(self) -> bool:
        return self.app_env == "production"

    @property
    def is_sqlite(self) -> bool:
        return "sqlite" in self.database_url


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
