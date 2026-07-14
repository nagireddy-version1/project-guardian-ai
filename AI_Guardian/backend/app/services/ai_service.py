import json
import re
from typing import Any

from openai import AzureOpenAI

from app.core.config import Settings
from app.models.decision import Decision
from app.prompts.extraction import DECISION_EXTRACTION_SYSTEM, DECISION_EXTRACTION_USER
from app.prompts.validation import VALIDATION_SYSTEM, VALIDATION_USER
from app.schemas import DecisionBase, Severity, ValidationAssessment, ValidationStatus


class AIService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def extract_decisions(
        self,
        *,
        content: str,
        document_name: str,
        source_type: str,
    ) -> list[DecisionBase]:
        if self.settings.should_use_mock_ai:
            return self._mock_extract(content=content, document_name=document_name)

        return self._azure_extract(
            content=content,
            document_name=document_name,
            source_type=source_type,
        )

    def validate_requirement(
        self,
        *,
        title: str,
        description: str,
        decisions: list[Decision],
    ) -> ValidationAssessment:
        if not decisions:
            return ValidationAssessment(
                status=ValidationStatus.NO_CONFLICT,
                severity=Severity.NONE,
                confidence=0.6,
                reason="Decision Memory is empty, so no integrity comparison was possible.",
                recommendation=(
                    "Upload meeting notes and extract decisions before validating requirements."
                ),
                new_requirement=f"{title}: {description}",
            )

        if self.settings.should_use_mock_ai:
            return self._mock_validate(
                title=title,
                description=description,
                decisions=decisions,
            )

        return self._azure_validate(
            title=title,
            description=description,
            decisions=decisions,
        )

    def _azure_extract(
        self,
        *,
        content: str,
        document_name: str,
        source_type: str,
    ) -> list[DecisionBase]:
        client = AzureOpenAI(
            api_key=self.settings.azure_openai_api_key,
            api_version=self.settings.azure_openai_api_version,
            azure_endpoint=self.settings.azure_openai_endpoint or "",
        )
        user_prompt = DECISION_EXTRACTION_USER.format(
            document_name=document_name,
            source_type=source_type,
            content=content[:12000],
        )
        response = client.chat.completions.create(
            model=self.settings.azure_openai_deployment,
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": DECISION_EXTRACTION_SYSTEM},
                {"role": "user", "content": user_prompt},
            ],
        )
        raw = response.choices[0].message.content or '{"decisions": []}'
        return self._parse_decisions_payload(raw)

    def _azure_validate(
        self,
        *,
        title: str,
        description: str,
        decisions: list[Decision],
    ) -> ValidationAssessment:
        client = AzureOpenAI(
            api_key=self.settings.azure_openai_api_key,
            api_version=self.settings.azure_openai_api_version,
            azure_endpoint=self.settings.azure_openai_endpoint or "",
        )
        decisions_json = json.dumps(
            [
                {
                    "id": d.id,
                    "title": d.title,
                    "category": d.category,
                    "decision": d.decision,
                    "reason": d.reason,
                }
                for d in decisions
            ],
            indent=2,
        )
        user_prompt = VALIDATION_USER.format(
            decisions_json=decisions_json,
            title=title,
            description=description[:8000],
        )
        response = client.chat.completions.create(
            model=self.settings.azure_openai_deployment,
            temperature=0.1,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": VALIDATION_SYSTEM},
                {"role": "user", "content": user_prompt},
            ],
        )
        raw = response.choices[0].message.content or "{}"
        return self._parse_validation_payload(raw, title=title, description=description)

    def _mock_validate(
        self,
        *,
        title: str,
        description: str,
        decisions: list[Decision],
    ) -> ValidationAssessment:
        text = f"{title}\n{description}".lower()
        requirement_summary = f"{title}: {description.strip()}"

        auth_decision = self._find_decision(
            decisions,
            keywords=("azure ad", "oauth", "authentication", "username/password"),
        )
        if auth_decision and any(
            token in text
            for token in (
                "guest checkout",
                "without account",
                "no azure",
                "no sso",
                "email only",
            )
        ):
            return ValidationAssessment(
                status=ValidationStatus.CONFLICT,
                severity=Severity.CRITICAL,
                confidence=0.94,
                matched_decision_title=auth_decision.title,
                existing_decision=auth_decision.decision,
                new_requirement=requirement_summary,
                reason=(
                    "The requirement allows checkout without Azure AD / account authentication, "
                    "which contradicts the approved Azure AD OAuth-only decision."
                ),
                recommendation=(
                    "Reject guest checkout as written, or open a formal decision change request "
                    "to revise the authentication standard before implementation."
                ),
            )

        payment_decision = self._find_decision(
            decisions,
            keywords=("stripe", "payment", "paypal"),
        )
        if payment_decision and "paypal" in text:
            return ValidationAssessment(
                status=ValidationStatus.CONFLICT,
                severity=Severity.HIGH,
                confidence=0.93,
                matched_decision_title=payment_decision.title,
                existing_decision=payment_decision.decision,
                new_requirement=requirement_summary,
                reason=(
                    "The requirement asks for PayPal, but Decision Memory records Stripe as the "
                    "sole approved payment gateway for v1."
                ),
                recommendation=(
                    "Keep Stripe-only for launch, or escalate a decision change with sales, "
                    "security, and architecture before adding PayPal."
                ),
            )

        data_decision = self._find_decision(
            decisions,
            keywords=("postgresql", "postgres", "database", "system of record"),
        )
        if data_decision and any(token in text for token in ("mongodb", "mongo", "mysql")):
            return ValidationAssessment(
                status=ValidationStatus.CONFLICT,
                severity=Severity.HIGH,
                confidence=0.9,
                matched_decision_title=data_decision.title,
                existing_decision=data_decision.decision,
                new_requirement=requirement_summary,
                reason=(
                    "The requirement introduces a non-PostgreSQL datastore for core data, "
                    "which contradicts the approved system-of-record decision."
                ),
                recommendation=(
                    "Use PostgreSQL for transactional entities, or explicitly revise the "
                    "data-platform decision before introducing another store."
                ),
            )

        for decision in decisions:
            if self._is_duplicate(text, decision):
                return ValidationAssessment(
                    status=ValidationStatus.DUPLICATE,
                    severity=Severity.LOW,
                    confidence=0.88,
                    matched_decision_title=decision.title,
                    existing_decision=decision.decision,
                    new_requirement=requirement_summary,
                    reason=(
                        "This requirement restates an already approved decision and does not "
                        "introduce new intent."
                    ),
                    recommendation=(
                        "Do not open a new discussion. Link to the existing decision in Decision "
                        "Memory and close the duplicate requirement."
                    ),
                )

        api_decision = self._find_decision(decisions, keywords=("rest", "graphql", "api"))
        if api_decision and "graphql" in text:
            return ValidationAssessment(
                status=ValidationStatus.DRIFT,
                severity=Severity.MEDIUM,
                confidence=0.86,
                matched_decision_title=api_decision.title,
                existing_decision=api_decision.decision,
                new_requirement=requirement_summary,
                reason=(
                    "The requirement introduces GraphQL for partner-facing surfaces, which "
                    "drifts from the approved versioned REST API decision without reversing it."
                ),
                recommendation=(
                    "Keep partner APIs on REST for this release, or schedule a formal "
                    "architecture review to change the API decision."
                ),
            )

        if auth_decision and any(
            token in text for token in ("optional login", "soft auth", "deferred auth")
        ):
            return ValidationAssessment(
                status=ValidationStatus.DRIFT,
                severity=Severity.MEDIUM,
                confidence=0.84,
                matched_decision_title=auth_decision.title,
                existing_decision=auth_decision.decision,
                new_requirement=requirement_summary,
                reason=(
                    "The requirement weakens authentication expectations without an explicit "
                    "decision change, creating decision drift."
                ),
                recommendation=(
                    "Clarify whether this is an approved exception. If not, align the requirement "
                    "to Azure AD OAuth."
                ),
            )

        return ValidationAssessment(
            status=ValidationStatus.NO_CONFLICT,
            severity=Severity.NONE,
            confidence=0.8,
            reason=(
                "No contradiction, duplicate, or material drift was found against Decision Memory."
            ),
            recommendation=(
                "Proceed with implementation and keep Decision Memory updated if scope changes."
            ),
            new_requirement=requirement_summary,
        )

    def _mock_extract(self, *, content: str, document_name: str) -> list[DecisionBase]:
        structured = self._parse_structured_meeting_notes(content)
        if structured:
            return structured

        lowered = content.lower()
        decisions: list[DecisionBase] = []

        if "azure ad" in lowered or "oauth" in lowered:
            decisions.append(
                DecisionBase(
                    title="Authenticate with Azure AD OAuth",
                    category="Security / Authentication",
                    decision="User authentication must use Azure AD OAuth.",
                    reason=f"Referenced as an approved approach in {document_name}.",
                    confidence=0.72,
                )
            )
        if "postgresql" in lowered or "postgres" in lowered:
            decisions.append(
                DecisionBase(
                    title="Use PostgreSQL as system of record",
                    category="Architecture / Data",
                    decision="PostgreSQL is the approved transactional database.",
                    reason=f"Database choice referenced in {document_name}.",
                    confidence=0.7,
                )
            )
        if "stripe" in lowered and "paypal" not in lowered:
            decisions.append(
                DecisionBase(
                    title="Use Stripe for payments",
                    category="Integrations / Payments",
                    decision="Stripe is the approved payment processor.",
                    reason=f"Payment provider referenced in {document_name}.",
                    confidence=0.7,
                )
            )
        if "rest api" in lowered or "versioned rest" in lowered:
            decisions.append(
                DecisionBase(
                    title="Use REST APIs for partners",
                    category="Architecture / API",
                    decision="External partner integrations use versioned REST APIs.",
                    reason=f"API style referenced in {document_name}.",
                    confidence=0.68,
                )
            )

        return decisions

    def _parse_structured_meeting_notes(self, content: str) -> list[DecisionBase]:
        blocks = re.split(r"DECISION\s+\d+\s*[—\-–:]", content, flags=re.IGNORECASE)
        if len(blocks) < 2:
            return []

        decisions: list[DecisionBase] = []
        for block in blocks[1:]:
            title = self._field(block, "Title")
            category = self._field(block, "Category")
            decision = self._field(block, "Decision")
            reason = self._field(block, "Reason")
            confidence_raw = self._field(block, "Confidence") or "0.8"
            if not (title and decision):
                continue
            decisions.append(
                DecisionBase(
                    title=title,
                    category=category or "General",
                    decision=decision,
                    reason=reason or "Extracted as a final decision from meeting notes.",
                    confidence=self._confidence_to_float(confidence_raw),
                )
            )
        return decisions

    @staticmethod
    def _find_decision(decisions: list[Decision], keywords: tuple[str, ...]) -> Decision | None:
        for decision in decisions:
            haystack = f"{decision.title} {decision.category} {decision.decision}".lower()
            if any(keyword in haystack for keyword in keywords):
                return decision
        return None

    @staticmethod
    def _is_duplicate(requirement_text: str, decision: Decision) -> bool:
        decision_text = f"{decision.title} {decision.decision}".lower()
        markers = [
            ("azure ad", "oauth"),
            ("postgresql", "postgres"),
            ("stripe",),
            ("rest api", "versioned rest"),
        ]
        for group in markers:
            req_hit = all(token in requirement_text for token in group)
            dec_hit = all(token in decision_text for token in group)
            if req_hit and dec_hit and any(
                phrase in requirement_text
                for phrase in ("already decided", "confirm decision", "restate", "as agreed")
            ):
                return True

        title_tokens = [t for t in re.split(r"\W+", decision.title.lower()) if len(t) > 3]
        if title_tokens and sum(1 for t in title_tokens if t in requirement_text) >= max(
            2, len(title_tokens) // 2
        ):
            return any(
                phrase in requirement_text
                for phrase in ("already decided", "confirm decision", "restate", "as agreed")
            )
        return False

    @staticmethod
    def _field(block: str, label: str) -> str | None:
        match = re.search(
            rf"{label}\s*:\s*(.+?)(?:\r?\n|$)",
            block,
            flags=re.IGNORECASE,
        )
        return match.group(1).strip() if match else None

    @staticmethod
    def _confidence_to_float(value: str) -> float:
        lowered = value.strip().lower()
        mapping = {"high": 0.92, "medium": 0.78, "low": 0.55}
        if lowered in mapping:
            return mapping[lowered]
        try:
            number = float(lowered)
            return min(max(number, 0.0), 1.0)
        except ValueError:
            return 0.8

    def _parse_decisions_payload(self, raw: str) -> list[DecisionBase]:
        data: dict[str, Any] = json.loads(raw)
        items = data.get("decisions", data if isinstance(data, list) else [])
        decisions: list[DecisionBase] = []
        for item in items:
            if not isinstance(item, dict):
                continue
            decisions.append(
                DecisionBase(
                    title=str(item.get("title", "")).strip() or "Untitled decision",
                    category=str(item.get("category", "General")).strip() or "General",
                    decision=str(item.get("decision", "")).strip(),
                    reason=str(item.get("reason", "")).strip() or "No reason provided.",
                    confidence=float(item.get("confidence", 0.8)),
                )
            )
        return [d for d in decisions if d.decision]

    def _parse_validation_payload(
        self,
        raw: str,
        *,
        title: str,
        description: str,
    ) -> ValidationAssessment:
        data: dict[str, Any] = json.loads(raw)
        status_raw = str(data.get("status", "no_conflict")).lower().replace(" ", "_")
        if status_raw not in {s.value for s in ValidationStatus}:
            status_raw = ValidationStatus.NO_CONFLICT.value
        severity_raw = str(data.get("severity", "none")).lower()
        if severity_raw not in {s.value for s in Severity}:
            severity_raw = Severity.NONE.value

        return ValidationAssessment(
            status=ValidationStatus(status_raw),
            severity=Severity(severity_raw),
            confidence=float(data.get("confidence", 0.8)),
            matched_decision_title=(data.get("matched_decision_title") or None),
            reason=str(data.get("reason", "")).strip() or "No reason provided.",
            recommendation=str(data.get("recommendation", "")).strip()
            or "Review with project leads.",
            existing_decision=(data.get("existing_decision") or None),
            new_requirement=data.get("new_requirement") or f"{title}: {description}",
        )
