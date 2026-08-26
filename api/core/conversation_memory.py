"""Context-aware conversation memory for clinical intake.

Maintains structured state alongside raw turn history so the Question Engine
never re-asks for information the patient already provided (including
semantically equivalent questions and multi-fact utterances).
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from core.schema import CollectedFields, Question

# Fields that answer the same clinical question — semantic duplicate groups.
SEMANTIC_FIELD_GROUPS: list[frozenset[str]] = [
    frozenset({"duration", "duration_days"}),
    frozenset({"medications", "takes_medication"}),
    frozenset({"allergies", "has_allergy"}),
]

# Map free-text question intents → canonical collected_fields keys.
QUESTION_INTENT_ALIASES: dict[str, str] = {
    "how_many_days": "duration",
    "how_long": "duration",
    "illness_duration": "duration",
    "days_sick": "duration",
    "kitne_din": "duration",
    "symptoms": "chief_complaint",
    "what_symptoms": "chief_complaint",
    "main_problem": "chief_complaint",
    "severity_level": "severity",
    "pain_level": "severity",
    "medicine": "medications",
    "taking_medicine": "medications",
    "allergy": "allergies",
}


class ConversationMemory(BaseModel):
    """Structured conversation state used for duplicate-question prevention."""

    model_config = ConfigDict(extra="ignore")

    collected_information: dict[str, Any] = Field(default_factory=dict)
    asked_questions: list[str] = Field(default_factory=list)
    answered_questions: list[str] = Field(default_factory=list)
    missing_information: list[str] = Field(default_factory=list)
    conversation_complete: bool = False

    def known_fields(self) -> set[str]:
        return {k for k, v in self.collected_information.items() if _is_known(v)}


def _is_known(value: Any) -> bool:
    if value is None or value == "unknown":
        return False
    if isinstance(value, list) and len(value) == 0:
        return False
    return True


def _field_equivalents(field: str) -> set[str]:
    for group in SEMANTIC_FIELD_GROUPS:
        if field in group:
            return set(group)
    return {field}


def resolve_field_intent(intent_or_field: str) -> str:
    """Map a question intent alias or field name to the canonical field key."""
    key = intent_or_field.strip().casefold()
    return QUESTION_INTENT_ALIASES.get(key, intent_or_field)


def is_field_answered(fields: CollectedFields, field: str) -> bool:
    """True if the field or a semantic equivalent is already collected."""
    canonical = resolve_field_intent(field)
    for candidate in _field_equivalents(canonical) | {canonical}:
        if fields.is_collected(candidate):
            return True
    # duration_days alone answers duration questions
    if canonical == "duration" and fields.duration_days is not None:
        return True
    return False


def was_question_asked(asked_ids: list[str], question: Question) -> bool:
    tracker = question_tracker_id(question)
    if tracker in asked_ids or question.id in asked_ids:
        return True
    return any(qid.endswith(f":{question.field}") for qid in asked_ids)


def question_tracker_id(question: Question) -> str:
    return f"{question.id}:{question.field}"


def infer_implied_fields(fields: CollectedFields) -> CollectedFields:
    """Fill fields that are already answered by other collected facts.

    Example: fever + listed headache/cough ⇒ associated_symptoms_checked.
    """
    data = fields.model_dump()
    concept_ids = {s.concept_id for s in fields.symptoms}
    if fields.chief_complaint and fields.chief_complaint.startswith("SYM_"):
        concept_ids.add(fields.chief_complaint)

    if "SYM_FEVER" in concept_ids or fields.fever == "true":
        data.setdefault("fever", fields.fever)
        if data.get("fever") in (None, "unknown"):
            data["fever"] = "true"
    if "SYM_HEADACHE" in concept_ids or fields.headache == "true":
        if data.get("headache") in (None, "unknown"):
            data["headache"] = "true"
    if "SYM_CHEST_PAIN" in concept_ids or fields.chest_pain == "true":
        if data.get("chest_pain") in (None, "unknown"):
            data["chest_pain"] = "true"
    if "SYM_BREATHING" in concept_ids or fields.breathing_difficulty == "true":
        if data.get("breathing_difficulty") in (None, "unknown"):
            data["breathing_difficulty"] = "true"
    if "SYM_VOMITING" in concept_ids or fields.vomiting == "true":
        if data.get("vomiting") in (None, "unknown"):
            data["vomiting"] = "true"

    # Associated symptoms already stated with fever → do not re-ask
    assoc_concepts = concept_ids - {"SYM_FEVER"}
    if (fields.fever == "true" or fields.complaint_category == "fever" or "SYM_FEVER" in concept_ids) and (
        assoc_concepts
        or fields.headache == "true"
        or fields.vomiting == "true"
        or any(c in concept_ids for c in ("SYM_COUGH", "SYM_HEADACHE", "SYM_BODY_PAIN"))
    ):
        if data.get("associated_symptoms_checked") in (None, "unknown"):
            data["associated_symptoms_checked"] = "true"

    # duration_days implies duration string
    if data.get("duration") in (None, "unknown") and data.get("duration_days") is not None:
        days = data["duration_days"]
        data["duration"] = f"{days} days"

    return CollectedFields.model_validate(data)


def build_memory(
    fields: CollectedFields,
    missing_fields: list[str],
    asked_questions: list[str] | None = None,
    *,
    conversation_complete: bool = False,
) -> ConversationMemory:
    collected: dict[str, Any] = {}
    for name, value in fields.model_dump().items():
        if _is_known(value):
            collected[name] = value

    answered = sorted(collected.keys())
    asked = list(asked_questions or [])
    return ConversationMemory(
        collected_information=collected,
        asked_questions=asked,
        answered_questions=answered,
        missing_information=list(missing_fields),
        conversation_complete=conversation_complete,
    )


def should_ask_question(
    question: Question,
    fields: CollectedFields,
    _asked_questions: list[str],
) -> bool:
    """Skip only when the answer (or a semantic equivalent) is already known.

    Previously asked-but-unanswered questions may be asked again so the intake
    can recover; duplicate prevention is answer-driven, not prompt-count-driven.
    """
    return not is_field_answered(fields, question.field)


def select_unasked_candidates(
    candidates: list[Question],
    fields: CollectedFields,
    asked_questions: list[str],
) -> list[Question]:
    return [q for q in candidates if should_ask_question(q, fields, asked_questions)]


def recent_patient_utterances(turn_history: list[dict[str, Any]], *, limit: int = 8) -> list[str]:
    texts: list[str] = []
    for turn in turn_history:
        if turn.get("speaker") == "patient" and turn.get("text"):
            texts.append(str(turn["text"]))
    return texts[-limit:]
