from fastapi import APIRouter, Depends

from app.schemas import SettingsRead, SettingsUpdate
from app.services.settings_service import SettingsService

router = APIRouter(tags=["settings"])


def get_settings_service() -> SettingsService:
    return SettingsService()


@router.get("/settings", response_model=SettingsRead)
def read_settings(
    service: SettingsService = Depends(get_settings_service),
) -> SettingsRead:
    return service.get()


@router.put("/settings", response_model=SettingsRead)
def update_settings(
    payload: SettingsUpdate,
    service: SettingsService = Depends(get_settings_service),
) -> SettingsRead:
    return service.update(payload)
