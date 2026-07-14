from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.schemas import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
def health_check(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> HealthResponse:
    db_status = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "error"

    return HealthResponse(
        status="ok" if db_status == "ok" else "degraded",
        app=settings.app_name,
        database=db_status,
        ai_mode="mock" if settings.should_use_mock_ai else "azure_openai",
    )
