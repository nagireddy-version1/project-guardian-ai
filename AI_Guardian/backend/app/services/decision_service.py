from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.decision import Decision
from app.repositories.decision_repository import DecisionRepository
from app.repositories.document_repository import DocumentRepository
from app.schemas import DecisionRead, ExtractDecisionsResponse
from app.services.ai_service import AIService


class DecisionService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.settings = settings
        self.documents = DocumentRepository(db)
        self.decisions = DecisionRepository(db)
        self.ai = AIService(settings)

    def extract_from_document(
        self,
        document_id: int,
        *,
        replace_existing: bool = True,
    ) -> ExtractDecisionsResponse:
        document = self.documents.get_by_id(document_id)
        if document is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {document_id} not found.",
            )

        removed = 0
        if replace_existing:
            removed = self.decisions.delete_by_document(document_id)

        extracted = self.ai.extract_decisions(
            content=document.content,
            document_name=document.original_name,
            source_type=document.source_type,
        )

        entities = [
            Decision(
                title=item.title,
                category=item.category,
                decision=item.decision,
                reason=item.reason,
                confidence=item.confidence,
                source_document=document.original_name,
                document_id=document.id,
            )
            for item in extracted
        ]
        saved = self.decisions.create_many(entities) if entities else []

        return ExtractDecisionsResponse(
            document_id=document.id,
            document_name=document.original_name,
            ai_mode="mock" if self.settings.should_use_mock_ai else "azure_openai",
            removed_existing=removed,
            extracted_count=len(saved),
            decisions=[DecisionRead.model_validate(item) for item in saved],
        )

    def list_decisions(self, document_id: int | None = None) -> list[Decision]:
        if document_id is not None:
            return self.decisions.list_by_document(document_id)
        return self.decisions.list_all()
