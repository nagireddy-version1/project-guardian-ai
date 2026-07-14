from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.core.database import get_db
from app.schemas import DocumentDetail, DocumentRead
from app.services.document_service import DocumentService

router = APIRouter(tags=["documents"])


def get_document_service(
    db: Session = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> DocumentService:
    return DocumentService(db=db, settings=settings)


@router.post("/upload-document", response_model=DocumentDetail, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    source_type: str = Form(default="meeting_notes"),
    service: DocumentService = Depends(get_document_service),
) -> DocumentDetail:
    document = await service.upload(file=file, source_type=source_type)
    return DocumentDetail.model_validate(document)


@router.get("/documents", response_model=list[DocumentRead])
def list_documents(
    service: DocumentService = Depends(get_document_service),
) -> list[DocumentRead]:
    return [DocumentRead.model_validate(doc) for doc in service.list_documents()]


@router.get("/documents/{document_id}", response_model=DocumentDetail)
def get_document(
    document_id: int,
    service: DocumentService = Depends(get_document_service),
) -> DocumentDetail:
    document = service.get_document(document_id)
    return DocumentDetail.model_validate(document)
