from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field, computed_field


class ValidationStatus(str, Enum):
    CONFLICT = "conflict"
    DUPLICATE = "duplicate"
    DRIFT = "drift"
    NO_CONFLICT = "no_conflict"


class Severity(str, Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class HealthResponse(BaseModel):
    status: str
    app: str
    database: str
    ai_mode: str


class DecisionBase(BaseModel):
    title: str
    category: str
    decision: str
    reason: str
    confidence: float = Field(ge=0, le=1, default=0.8)


class DecisionCreate(DecisionBase):
    source_document: str
    document_id: int | None = None


class DecisionRead(DecisionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    source_document: str
    document_id: int | None = None
    created_at: datetime


class ExtractDecisionsResponse(BaseModel):
    document_id: int
    document_name: str
    ai_mode: str
    removed_existing: int
    extracted_count: int
    decisions: list[DecisionRead]


class DocumentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    filename: str
    original_name: str
    content_type: str
    source_type: str
    uploaded_at: datetime


class DocumentDetail(DocumentRead):
    content: str

    @computed_field
    @property
    def preview(self) -> str:
        text = self.content.strip()
        return text[:280] + ("…" if len(text) > 280 else "")


class RequirementCreate(BaseModel):
    title: str
    description: str


class RequirementRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    uploaded_at: datetime


class ValidationResultRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    decision_id: int | None
    requirement_id: int
    status: ValidationStatus
    severity: Severity
    reason: str
    recommendation: str
    confidence: float
    created_at: datetime


class ValidationAssessment(BaseModel):
    status: ValidationStatus
    severity: Severity = Severity.NONE
    confidence: float = Field(ge=0, le=1, default=0.8)
    matched_decision_title: str | None = None
    reason: str
    recommendation: str
    existing_decision: str | None = None
    new_requirement: str | None = None


class ValidateRequirementResponse(BaseModel):
    ai_mode: str
    requirement: RequirementRead
    validation: ValidationResultRead
    matched_decision: DecisionRead | None = None
    existing_decision: str | None = None
    new_requirement: str | None = None


class ValidationHistoryItem(ValidationResultRead):
    requirement_title: str | None = None
    decision_title: str | None = None


class DashboardSummary(BaseModel):
    total_decisions: int
    total_documents: int
    total_requirements: int
    total_validations: int
    conflicts: int
    duplicates: int
    drifts: int
    no_conflicts: int
    ai_mode: str
    open_risks: int
    recent_validations: list[ValidationHistoryItem] = []
    recent_decisions: list[DecisionRead] = []


class SettingsRead(BaseModel):
    app_name: str
    use_mock_ai: bool
    azure_configured: bool
    azure_openai_endpoint: str | None = None
    azure_openai_deployment: str
    azure_openai_api_version: str
    api_key_configured: bool
    effective_ai_mode: str
    note: str


class SettingsUpdate(BaseModel):
    use_mock_ai: bool | None = None
    azure_openai_endpoint: str | None = None
    azure_openai_api_key: str | None = None
    azure_openai_deployment: str | None = None
    azure_openai_api_version: str | None = None
