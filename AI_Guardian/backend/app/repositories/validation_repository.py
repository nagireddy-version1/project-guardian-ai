from sqlalchemy.orm import Session

from app.models.requirement import Requirement
from app.models.validation import ValidationResult


class RequirementRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, requirement: Requirement) -> Requirement:
        self.db.add(requirement)
        self.db.commit()
        self.db.refresh(requirement)
        return requirement

    def get_by_id(self, requirement_id: int) -> Requirement | None:
        return self.db.query(Requirement).filter(Requirement.id == requirement_id).first()


class ValidationRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create(self, result: ValidationResult) -> ValidationResult:
        self.db.add(result)
        self.db.commit()
        self.db.refresh(result)
        return result

    def list_all(self) -> list[ValidationResult]:
        return (
            self.db.query(ValidationResult)
            .order_by(ValidationResult.created_at.desc())
            .all()
        )
