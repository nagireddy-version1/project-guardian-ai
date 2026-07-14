from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.decision import Decision
from app.models.document import Document
from app.models.requirement import Requirement
from app.models.validation import ValidationResult
from app.schemas import (
    DashboardSummary,
    DecisionRead,
    ValidationStatus,
)
from app.services.validation_service import ValidationService


class DashboardService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.db = db
        self.settings = settings

    def summary(self) -> DashboardSummary:
        total_decisions = self.db.query(func.count(Decision.id)).scalar() or 0
        total_documents = self.db.query(func.count(Document.id)).scalar() or 0
        total_requirements = self.db.query(func.count(Requirement.id)).scalar() or 0
        total_validations = self.db.query(func.count(ValidationResult.id)).scalar() or 0

        status_counts = dict(
            self.db.query(ValidationResult.status, func.count(ValidationResult.id))
            .group_by(ValidationResult.status)
            .all()
        )
        conflicts = int(status_counts.get(ValidationStatus.CONFLICT.value, 0))
        duplicates = int(status_counts.get(ValidationStatus.DUPLICATE.value, 0))
        drifts = int(status_counts.get(ValidationStatus.DRIFT.value, 0))
        no_conflicts = int(status_counts.get(ValidationStatus.NO_CONFLICT.value, 0))

        recent_decisions = [
            DecisionRead.model_validate(row)
            for row in (
                self.db.query(Decision)
                .order_by(Decision.created_at.desc())
                .limit(5)
                .all()
            )
        ]

        history = ValidationService(self.db, self.settings).history()[:5]

        return DashboardSummary(
            total_decisions=total_decisions,
            total_documents=total_documents,
            total_requirements=total_requirements,
            total_validations=total_validations,
            conflicts=conflicts,
            duplicates=duplicates,
            drifts=drifts,
            no_conflicts=no_conflicts,
            open_risks=conflicts + drifts,
            ai_mode="mock" if self.settings.should_use_mock_ai else "azure_openai",
            recent_validations=history,
            recent_decisions=recent_decisions,
        )
