"""Shared intake schema — single source of truth (04_Backend_Architecture §2.7, 07_DB).

Clinical booleans are never Python bool. Missing data is the literal 'unknown'.
"""

from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

ClinicalTriState = Literal["true", "false", "unknown"]
Severity = Literal["mild", "moderate", "severe", "unknown"]
UnknownStr = Literal["unknown"]


class SessionStatus(str, Enum):
    IN_PROGRESS = "IN_PROGRESS"
    SUBMITTED = "SUBMITTED"
    ABANDONED = "ABANDONED"


class IntakeStatus(str, Enum):
    AI_GENERATED = "AI_GENERATED"
    DOCTOR_VERIFIED = "DOCTOR_VERIFIED"


class PriorityFlag(str, Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    NONE = "NONE"


class InputType(str, Enum):
    TEXT = "text"
    AUDIO = "audio"


class ConsultationPhase(str, Enum):
    BASIC_DETAILS = "basic_details"
    CONSULTATION = "consultation"
    COMPLETED = "completed"


class ConsultationSummary(BaseModel):
    """Structured consultation summary displayed to the patient at the end."""

    model_config = ConfigDict(extra="ignore")

    patient_name: str | None = None
    patient_age: int | None = None
    patient_gender: str | None = None
    main_complaint: str | None = None
    symptoms: list[str] = Field(default_factory=list)
    duration: str | None = None
    severity: str | None = None
    medical_history: list[str] = Field(default_factory=list)
    current_medications: list[str] = Field(default_factory=list)
    allergies: str | None = None
    observations: list[str] = Field(default_factory=list)
    recommended_next_steps: list[str] = Field(default_factory=list)
    doctor_consultation_advised: bool = True
    ai_disclaimer: str = (
        "This is an AI-generated consultation summary, not a medical diagnosis. "
        "Please consult a qualified healthcare professional for proper evaluation and treatment."
    )


class SymptomItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    concept_id: str
    raw_term: str | None = None
    duration: str | UnknownStr = "unknown"
    severity: Severity = "unknown"


class Contradiction(BaseModel):
    field: str
    statement_a: Any
    statement_b: Any
    turn_refs: list[str] = Field(default_factory=list)


class CollectedFields(BaseModel):
    """Working intake state. Clinical flags use tri-state, never inferred false."""

    model_config = ConfigDict(extra="ignore")

    display_name: str | None = None
    age: int | None = None
    gender: str | UnknownStr = "unknown"
    preferred_language: str | None = None
    dialect_hint: str | None = None
    chief_complaint: str | None = None
    complaint_category: str | None = None
    duration: str | UnknownStr = "unknown"
    duration_days: int | None = None
    severity: Severity = "unknown"
    symptoms: list[SymptomItem] = Field(default_factory=list)
    medical_history: list[str] | UnknownStr = "unknown"
    medications: list[str] | Literal["none"] | UnknownStr = "unknown"
    takes_medication: ClinicalTriState = "unknown"
    allergies: str | Literal["none"] | UnknownStr = "unknown"
    has_allergy: ClinicalTriState = "unknown"
    chest_pain: ClinicalTriState = "unknown"
    breathing_difficulty: ClinicalTriState = "unknown"
    fever: ClinicalTriState = "unknown"
    vomiting: ClinicalTriState = "unknown"
    headache: ClinicalTriState = "unknown"
    onset: str | UnknownStr = "unknown"
    associated_symptoms_checked: ClinicalTriState = "unknown"

    @field_validator("age")
    @classmethod
    def age_range(cls, v: int | None) -> int | None:
        if v is None:
            return v
        if v < 0 or v > 120:
            raise ValueError("age out of range")
        return v

    @model_validator(mode="after")
    def no_bool_clinical_flags(self) -> CollectedFields:
        for name in (
            "takes_medication",
            "has_allergy",
            "chest_pain",
            "breathing_difficulty",
            "fever",
            "vomiting",
            "headache",
            "associated_symptoms_checked",
        ):
            val = getattr(self, name)
            if isinstance(val, bool):
                raise ValueError(f"{name} must be true|false|unknown, not boolean")
        return self

    def merge_delta(self, delta: dict[str, Any]) -> CollectedFields:
        data = self.model_dump()
        for key, value in delta.items():
            if value is None:
                continue
            if key == "symptoms" and isinstance(value, list):
                existing = {s["concept_id"]: s for s in data.get("symptoms") or []}
                for item in value:
                    if isinstance(item, dict) and item.get("concept_id"):
                        existing[item["concept_id"]] = item
                    elif hasattr(item, "model_dump"):
                        dumped = item.model_dump()
                        existing[dumped["concept_id"]] = dumped
                data["symptoms"] = list(existing.values())
            else:
                data[key] = value
        return CollectedFields.model_validate(data)

    def is_collected(self, field: str) -> bool:
        value = getattr(self, field, "unknown")
        if value is None:
            return False
        if value == "unknown":
            return False
        if isinstance(value, list) and len(value) == 0:
            return False
        return True


class ExtractionDelta(BaseModel):
    """LLM may only return a delta of newly stated fields. No priority_flag."""

    model_config = ConfigDict(extra="ignore")

    display_name: str | None = None
    age: int | None = None
    gender: str | None = None
    chief_complaint: str | None = None
    complaint_category: str | None = None
    duration: str | None = None
    duration_days: int | None = None
    severity: Severity | None = None
    symptoms: list[SymptomItem] | None = None
    medical_history: list[str] | Literal["unknown"] | None = None
    medications: list[str] | Literal["none", "unknown"] | None = None
    takes_medication: ClinicalTriState | None = None
    allergies: str | Literal["none", "unknown"] | None = None
    has_allergy: ClinicalTriState | None = None
    chest_pain: ClinicalTriState | None = None
    breathing_difficulty: ClinicalTriState | None = None
    fever: ClinicalTriState | None = None
    vomiting: ClinicalTriState | None = None
    headache: ClinicalTriState | None = None
    onset: str | None = None
    associated_symptoms_checked: ClinicalTriState | None = None

    @model_validator(mode="before")
    @classmethod
    def reject_clinical_judgment_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            forbidden = {"priority_flag", "priority", "diagnosis", "prescription", "treatment"}
            leaked = forbidden.intersection(data.keys())
            if leaked:
                for key in leaked:
                    data.pop(key, None)
        return data


class TurnRecord(BaseModel):
    turn_id: str
    speaker: Literal["patient", "ai"]
    text: str
    input_type: InputType | None = None
    extracted_delta: dict[str, Any] = Field(default_factory=dict)
    asr_confidence: float | None = None
    model_version: str | None = None
    validation_ok: bool = True


class RuleEngineResult(BaseModel):
    missing_fields: list[str] = Field(default_factory=list)
    contradictions: list[Contradiction] = Field(default_factory=list)
    priority_flag: PriorityFlag = PriorityFlag.NONE
    matched_rule_ids: list[str] = Field(default_factory=list)


class Question(BaseModel):
    id: str
    complaint_category: str
    field: str
    question_text_key: str
    question_text: dict[str, str] = Field(default_factory=dict)
    priority_order: int = 100


class LanguageOption(BaseModel):
    code: str
    name: str
    native_name: str
    script: str
    tier: int
    asr_supported: bool
    tts_supported: bool


class ApiError(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)
