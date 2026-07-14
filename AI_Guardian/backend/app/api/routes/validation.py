from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.schemas import (
    RequirementCreate,
    ValidateRequirementResponse,
    ValidationHistoryItem,
)
from app.services.validation_service import ValidationService

router = APIRouter(tags=["validation"])


def get_validation_service(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> ValidationService:
    return ValidationService(db=db, settings=settings)


@router.post("/validate-requirement", response_model=ValidateRequirementResponse)
def validate_requirement(
    payload: RequirementCreate,
    service: ValidationService = Depends(get_validation_service),
) -> ValidateRequirementResponse:
    return service.validate(payload)


@router.get("/validation-history", response_model=list[ValidationHistoryItem])
def validation_history(
    service: ValidationService = Depends(get_validation_service),
) -> list[ValidationHistoryItem]:
    return service.history()
