import re
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.document import Document
from app.repositories.document_repository import DocumentRepository

ALLOWED_EXTENSIONS = {".txt", ".md", ".text"}
MAX_UPLOAD_BYTES = 2 * 1024 * 1024  # 2 MB


class DocumentService:
    def __init__(self, db: Session, settings: Settings) -> None:
        self.settings = settings
        self.repo = DocumentRepository(db)

    async def upload(
        self,
        file: UploadFile,
        source_type: str = "meeting_notes",
    ) -> Document:
        original_name = file.filename or "untitled.txt"
        extension = Path(original_name).suffix.lower() or ".txt"

        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported file type '{extension}'. Allowed: .txt, .md",
            )

        raw = await file.read()
        if not raw:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty.",
            )
        if len(raw) > MAX_UPLOAD_BYTES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File exceeds 2 MB limit.",
            )

        try:
            content = raw.decode("utf-8")
        except UnicodeDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be UTF-8 text.",
            ) from exc

        stored_name = f"{uuid.uuid4().hex}{extension}"
        upload_dir = Path(self.settings.upload_dir)
        upload_dir.mkdir(parents=True, exist_ok=True)
        (upload_dir / stored_name).write_text(content, encoding="utf-8")

        document = Document(
            filename=stored_name,
            original_name=original_name,
            content_type=file.content_type or "text/plain",
            source_type=self._normalize_source_type(source_type),
            content=content,
        )
        return self.repo.create(document)

    def list_documents(self) -> list[Document]:
        return self.repo.list_all()

    def get_document(self, document_id: int) -> Document:
        document = self.repo.get_by_id(document_id)
        if document is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document {document_id} not found.",
            )
        return document

    @staticmethod
    def _normalize_source_type(source_type: str) -> str:
        normalized = re.sub(r"[^a-z0-9_]+", "_", source_type.strip().lower())
        allowed = {"meeting_notes", "jira_story", "github_pr", "outlook_email", "other"}
        return normalized if normalized in allowed else "other"
