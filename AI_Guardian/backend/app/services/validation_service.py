from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.decision import Decision
from app.models.requirement import Requirement
from app.models.validation import ValidationResult
from app.repositories.decision_repository import DecisionRepository
from app.repositories.validation_repository import RequirementRepository, ValidationRepository
from app.schemas import (
    DecisionRead,
    RequirementCreate,
    RequirementRead,
    ValidateRequirementResponse,
    ValidationHistoryItem,
    ValidationResultRead,
)
from app.services.ai_service import AIService


class ValidationService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.settings = settings
        self.db = db
        self.decisions = DecisionRepository(db)
        self.requirements = RequirementRepository(db)
        self.validations = ValidationRepository(db)
        self.ai = AIService(settings)

    def validate(self, payload: RequirementCreate) -> ValidateRequirementResponse:
        requirement = self.requirements.create(
            Requirement(title=payload.title.strip(), description=payload.description.strip())
        )
        decision_rows = self.decisions.list_all()
        assessment = self.ai.validate_requirement(
            title=requirement.title,
            description=requirement.description,
            decisions=decision_rows,
        )

        matched = self._match_decision(decision_rows, assessment.matched_decision_title)
        result = self.validations.create(
            ValidationResult(
                decision_id=matched.id if matched else None,
                requirement_id=requirement.id,
                status=assessment.status.value,
                severity=assessment.severity.value,
                reason=assessment.reason,
                recommendation=assessment.recommendation,
                confidence=assessment.confidence,
            )
        )

        return ValidateRequirementResponse(
            ai_mode="mock" if self.settings.should_use_mock_ai else "azure_openai",
            requirement=RequirementRead.model_validate(requirement),
            validation=ValidationResultRead.model_validate(result),
            matched_decision=DecisionRead.model_validate(matched) if matched else None,
            existing_decision=assessment.existing_decision
            or (matched.decision if matched else None),
            new_requirement=assessment.new_requirement,
        )

    def history(self) -> list[ValidationHistoryItem]:
        items: list[ValidationHistoryItem] = []
        for row in self.validations.list_all():
            requirement = self.requirements.get_by_id(row.requirement_id)
            decision = None
            if row.decision_id is not None:
                decision = (
                    self.db.query(Decision).filter(Decision.id == row.decision_id).first()
                )
            base = ValidationResultRead.model_validate(row)
            items.append(
                ValidationHistoryItem(
                    **base.model_dump(),
                    requirement_title=requirement.title if requirement else None,
                    decision_title=decision.title if decision else None,
                )
            )
        return items

    @staticmethod
    def _match_decision(
        decisions: list[Decision],
        matched_title: str | None,
    ) -> Decision | None:
        if not matched_title:
            return None
        needle = matched_title.strip().lower()
        for decision in decisions:
            if decision.title.strip().lower() == needle:
                return decision
        for decision in decisions:
            if needle in decision.title.lower() or decision.title.lower() in needle:
                return decision
        return None
