from sqlalchemy.orm import Session

from app.models.decision import Decision


class DecisionRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    def create_many(self, decisions: list[Decision]) -> list[Decision]:
        self.db.add_all(decisions)
        self.db.commit()
        for decision in decisions:
            self.db.refresh(decision)
        return decisions

    def list_all(self) -> list[Decision]:
        return self.db.query(Decision).order_by(Decision.created_at.desc()).all()

    def list_by_document(self, document_id: int) -> list[Decision]:
        return (
            self.db.query(Decision)
            .filter(Decision.document_id == document_id)
            .order_by(Decision.created_at.desc())
            .all()
        )

    def delete_by_document(self, document_id: int) -> int:
        deleted = (
            self.db.query(Decision)
            .filter(Decision.document_id == document_id)
            .delete(synchronize_session=False)
        )
        self.db.commit()
        return deleted
