from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import utcnow


class ValidationResult(Base):
    __tablename__ = "validation_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    decision_id: Mapped[int | None] = mapped_column(ForeignKey("decisions.id"), nullable=True)
    requirement_id: Mapped[int] = mapped_column(ForeignKey("requirements.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    severity: Mapped[str] = mapped_column(String(50), default="none")
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    recommendation: Mapped[str] = mapped_column(Text, nullable=False)
    confidence: Mapped[float] = mapped_column(Float, default=0.8)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    decision: Mapped["Decision | None"] = relationship(back_populates="validations")
    requirement: Mapped["Requirement"] = relationship(back_populates="validations")
