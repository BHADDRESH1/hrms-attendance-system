import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator

class Settings(BaseSettings):
    APP_NAME: str = "HRMS Attendance API"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # Database Settings
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/hrms_db",
        description="Async PostgreSQL Database URL connection string"
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_url(cls, v: str) -> str:
        if isinstance(v, str):
            if v.startswith("postgresql://"):
                return v.replace("postgresql://", "postgresql+asyncpg://", 1)
            elif v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+asyncpg://", 1)
        return v

    # Supabase Settings
    SUPABASE_URL: str = Field(
        default="https://placeholder-project-id.supabase.co",
        description="Supabase API URL"
    )
    SUPABASE_ANON_KEY: str = Field(
        default="placeholder-anon-key",
        description="Supabase Anonymous API Key"
    )
    SUPABASE_JWT_SECRET: str = Field(
        default="placeholder-jwt-secret-used-for-local-token-verification",
        description="Supabase JWT secret for validating access tokens locally"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings(
    # Fallbacks or manual overrides can go here if needed during test runs
    _env_file=".env" if os.path.exists(".env") else None
)
