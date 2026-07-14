from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]
PROJECT_ROOT = BACKEND_ROOT.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "AI Guardian"
    database_url: str = f"sqlite:///{(PROJECT_ROOT / 'database' / 'guardian.db').as_posix()}"
    upload_dir: str = str(BACKEND_ROOT / "uploads")
    use_mock_ai: bool = True
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    azure_openai_api_key: str | None = None
    azure_openai_endpoint: str | None = None
    azure_openai_deployment: str = "gpt-4o"
    azure_openai_api_version: str = "2024-08-01-preview"

    @field_validator("database_url", "upload_dir", "azure_openai_api_key", "azure_openai_endpoint", mode="before")
    @classmethod
    def empty_as_none(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip():
            return None
        return value

    @field_validator("database_url", mode="before")
    @classmethod
    def default_database_url(cls, value: object) -> object:
        if value is None or (isinstance(value, str) and not value.strip()):
            return f"sqlite:///{(PROJECT_ROOT / 'database' / 'guardian.db').as_posix()}"
        return value

    @field_validator("upload_dir", mode="before")
    @classmethod
    def default_upload_dir(cls, value: object) -> object:
        if value is None or (isinstance(value, str) and not value.strip()):
            return str(BACKEND_ROOT / "uploads")
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def azure_configured(self) -> bool:
        return bool(self.azure_openai_api_key and self.azure_openai_endpoint)

    @property
    def should_use_mock_ai(self) -> bool:
        return self.use_mock_ai or not self.azure_configured


@lru_cache
def get_settings() -> Settings:
    return Settings()


def clear_settings_cache() -> None:
    get_settings.cache_clear()
