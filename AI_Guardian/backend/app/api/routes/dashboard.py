from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.schemas import DashboardSummary
from app.services.dashboard_service import DashboardService

router = APIRouter(tags=["dashboard"])


def get_dashboard_service(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> DashboardService:
    return DashboardService(db=db, settings=settings)


@router.get("/dashboard", response_model=DashboardSummary)
def dashboard(
    service: DashboardService = Depends(get_dashboard_service),
) -> DashboardSummary:
    return service.summary()
