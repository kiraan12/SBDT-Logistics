from __future__ import annotations

import os
from typing import List, Optional

from pydantic import AnyHttpUrl, Field, PostgresDsn, RedisDsn, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Project ───────────────────────────────────────────────────────────────
    PROJECT_NAME: str = "SBDT Logistics"
    API_V1_STR: str = "/api/v1"

    # !! REQUIRED in production — override via .env or environment variable !!
    SECRET_KEY: str = Field(
        default="changethis_secret_key_for_dev_only",
        description="JWT signing secret. Must be overridden in production.",
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    # ── Database ──────────────────────────────────────────────────────────────
    POSTGRES_SERVER:   str = "localhost"
    POSTGRES_USER:     str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB:       str = "sbdt_logistics"

    # If DATABASE_URL is set explicitly it takes priority; otherwise it is
    # assembled from the individual POSTGRES_* vars in the validator below.
    DATABASE_URL: Optional[str] = None

    # Connection pool (for ~100 concurrent users: pool_size 10–20 per worker, max_overflow 10–20)
    # Total connections ≈ (pool_size + max_overflow) * number of app workers. Keep below PostgreSQL max_connections.
    DB_POOL_SIZE: int = 10
    DB_POOL_MAX_OVERFLOW: int = 10
    DB_POOL_RECYCLE_SEC: int = 3600  # Recycle connections after 1 hour to avoid stale connections

    @model_validator(mode="after")
    def _assemble_db_url(self) -> "Settings":
        """Build DATABASE_URL from parts when not supplied directly."""
        if not self.DATABASE_URL:
            self.DATABASE_URL = (
                f"postgresql://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
                f"@{self.POSTGRES_SERVER}/{self.POSTGRES_DB}"
            )
        return self

    # ── Redis / Celery (fully optional) ──────────────────────────────────────
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    # Set to "memory://" (or leave empty) to disable Celery and use in-process fallback.
    # Set to "redis://localhost:6379/0" (or a full URL) to enable Celery.
    REDIS_URL: str = ""

    @property
    def effective_redis_url(self) -> str:
        """
        Resolved Redis URL:
          1. REDIS_URL env var if non-empty
          2. Built from REDIS_HOST + REDIS_PORT
          3. 'memory://' if neither is set
        """
        url = self.REDIS_URL.strip()
        if url:
            return url
        host = self.REDIS_HOST.strip()
        if host:
            return f"redis://{host}:{self.REDIS_PORT}/0"
        return "memory://"

    @property
    def celery_enabled(self) -> bool:
        """True when a real Redis broker is configured."""
        return not self.effective_redis_url.startswith("memory://")

    # ── CORS ──────────────────────────────────────────────────────────────────
    # In .env supply a JSON list:  BACKEND_CORS_ORIGINS=["http://localhost:3000"]
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def _parse_cors(cls, v: object) -> object:
        """
        Accept either a real Python list or a comma-separated string so that
        both .env formats work:
          BACKEND_CORS_ORIGINS=http://localhost:3000,https://myapp.com
          BACKEND_CORS_ORIGINS=["http://localhost:3000"]
        """
        if isinstance(v, str) and not v.startswith("["):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v

    # ── Storage ───────────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"

    @property
    def upload_dir_abs(self) -> str:
        """Always returns an absolute path regardless of working directory."""
        return os.path.abspath(self.UPLOAD_DIR)

    # ── LR PDF ─────────────────────────────────────────────────────────────────
    # Path to logo image for LR copies (e.g. "static/logo.png" or absolute path). Optional.
    LR_LOGO_PATH: Optional[str] = None
    # Path to QR code image for LR header (e.g. "static/qr_code.png" or "static/qr_code.jpeg"). Optional.
    QR_CODE_PATH: Optional[str] = None
    # Digital LR signatory: name shown as "Authorised Signatory" on LR copies. Optional.
    DEFAULT_LR_SIGNATORY: Optional[str] = None

    # ── Initial seed users (optional; set in .env for real credentials) ───────
    # Used by app.initial_data when creating/resetting admin and owner.
    # Do not commit real passwords to the repo; use .env (and keep .env in .gitignore).
    INITIAL_ADMIN_EMAIL: str = "admin@sbdt.com"
    INITIAL_ADMIN_PASSWORD: str = "admin123"
    INITIAL_OWNER_EMAIL: str = "owner@sbdt.com"
    INITIAL_OWNER_PASSWORD: str = "owner123"

    # ── GST ───────────────────────────────────────────────────────────────────
    SBDT_GST_NUMBER: str = "29JRTPS8965K1Z3"

    @field_validator("SBDT_GST_NUMBER")
    @classmethod
    def _validate_gst(cls, v: str) -> str:
        """Basic GST number format check: 15 alphanumeric characters."""
        v = v.strip().upper()
        if len(v) != 15 or not v.isalnum():
            raise ValueError(
                f"SBDT_GST_NUMBER '{v}' is not a valid 15-character GST number."
            )
        return v

    # ── Security note: default SECRET_KEY is for dev only ───────────────────
    @field_validator("SECRET_KEY")
    @classmethod
    def _warn_default_secret(cls, v: str) -> str:
        if v == "changethis_secret_key_for_dev_only":
            import logging
            logging.getLogger(__name__).info(
                "Using default SECRET_KEY. Set SECRET_KEY in .env for production."
            )
        return v

    # ── Pydantic config ───────────────────────────────────────────────────────
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        # Allow extra fields in .env without crashing (e.g. CI-injected vars)
        extra="ignore",
    )


# ── Singleton ─────────────────────────────────────────────────────────────────
settings = Settings()