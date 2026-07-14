from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.schemas import DecisionRead, ExtractDecisionsResponse
from app.services.decision_service import DecisionService

router = APIRouter(tags=["decisions"])


class ExtractDecisionsRequest(BaseModel):
    document_id: int = Field(..., ge=1)
    replace_existing: bool = True


def get_decision_service(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> DecisionService:
    return DecisionService(db=db, settings=settings)


@router.post("/extract-decisions", response_model=ExtractDecisionsResponse)
def extract_decisions(
    payload: ExtractDecisionsRequest,
    service: DecisionService = Depends(get_decision_service),
) -> ExtractDecisionsResponse:
    return service.extract_from_document(
        payload.document_id,
        replace_existing=payload.replace_existing,
    )


@router.get("/decisions", response_model=list[DecisionRead])
def list_decisions(
    document_id: int | None = Query(default=None),
    service: DecisionService = Depends(get_decision_service),
) -> list[DecisionRead]:
    decisions = service.list_decisions(document_id=document_id)
    return [DecisionRead.model_validate(item) for item in decisions]
