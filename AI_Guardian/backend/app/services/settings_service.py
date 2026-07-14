from pathlib import Path

from app.core.config import BACKEND_ROOT, Settings, clear_settings_cache, get_settings
from app.schemas import SettingsRead, SettingsUpdate

ENV_PATH = BACKEND_ROOT / ".env"


class SettingsService:
    def get(self) -> SettingsRead:
        settings = get_settings()
        return SettingsRead(
            app_name=settings.app_name,
            use_mock_ai=settings.use_mock_ai,
            azure_configured=settings.azure_configured,
            azure_openai_endpoint=settings.azure_openai_endpoint,
            azure_openai_deployment=settings.azure_openai_deployment,
            azure_openai_api_version=settings.azure_openai_api_version,
            api_key_configured=bool(settings.azure_openai_api_key),
            effective_ai_mode="mock" if settings.should_use_mock_ai else "azure_openai",
            note=(
                "Mock mode is active when USE_MOCK_AI=true or Azure credentials are missing. "
                "Demo works fully without Azure OpenAI."
            ),
        )

    def update(self, payload: SettingsUpdate) -> SettingsRead:
        current = get_settings()
        values = {
            "USE_MOCK_AI": (
                str(payload.use_mock_ai).lower()
                if payload.use_mock_ai is not None
                else str(current.use_mock_ai).lower()
            ),
            "AZURE_OPENAI_ENDPOINT": self._resolve_optional(
                payload.azure_openai_endpoint,
                current.azure_openai_endpoint,
            ),
            "AZURE_OPENAI_API_KEY": self._resolve_optional(
                payload.azure_openai_api_key,
                current.azure_openai_api_key,
            ),
            "AZURE_OPENAI_DEPLOYMENT": (
                payload.azure_openai_deployment
                if payload.azure_openai_deployment is not None
                else current.azure_openai_deployment
            ),
            "AZURE_OPENAI_API_VERSION": (
                payload.azure_openai_api_version
                if payload.azure_openai_api_version is not None
                else current.azure_openai_api_version
            ),
            "CORS_ORIGINS": current.cors_origins,
        }
        self._write_env(values)
        clear_settings_cache()
        return self.get()

    @staticmethod
    def _resolve_optional(incoming: str | None, existing: str | None) -> str:
        if incoming is None:
            return existing or ""
        return incoming.strip()

    @staticmethod
    def _write_env(values: dict[str, str]) -> None:
        lines = [
            f"USE_MOCK_AI={values['USE_MOCK_AI']}",
            f"CORS_ORIGINS={values['CORS_ORIGINS']}",
            f"AZURE_OPENAI_ENDPOINT={values['AZURE_OPENAI_ENDPOINT']}",
            f"AZURE_OPENAI_API_KEY={values['AZURE_OPENAI_API_KEY']}",
            f"AZURE_OPENAI_DEPLOYMENT={values['AZURE_OPENAI_DEPLOYMENT']}",
            f"AZURE_OPENAI_API_VERSION={values['AZURE_OPENAI_API_VERSION']}",
            "",
        ]
        Path(ENV_PATH).write_text("\n".join(lines), encoding="utf-8")
