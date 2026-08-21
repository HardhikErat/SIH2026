"""Deterministic Rule Engine — 14_AI_NLP_Architecture §5. No LLM involvement."""

from __future__ import annotations

from typing import Any

from core.schema import (
    CollectedFields,
    Contradiction,
    PriorityFlag,
    RuleEngineResult,
    TurnRecord,
)

# 14 §5.1 — required-field checklist per complaint category
REQUIRED_FIELDS_BY_CATEGORY: dict[str, list[str]] = {
    "fever": [
        "duration",
        "severity",
        "medications",
        "allergies",
        "associated_symptoms_checked",
    ],
    "chest_pain": [
        "duration",
        "onset",
        "breathing_difficulty",
        "medications",
        "allergies",
    ],
    "headache": [
        "duration",
        "severity",
        "vomiting",
        "fever",
        "allergies",
    ],
    "cough": [
        "duration",
        "severity",
        "breathing_difficulty",
        "medications",
        "allergies",
    ],
    "default": [
        "chief_complaint",
        "duration",
        "medications",
        "allergies",
    ],
}

# Versioned static priority rules (14 §5.3). Evaluated over structured fields only.
PRIORITY_RULES: list[dict[str, Any]] = [
    {
        "id": "PR_CHEST_BREATH",
        "version": 1,
        "is_active": True,
        "resulting_flag": PriorityFlag.HIGH,
        "description": "chest_pain == true AND breathing_difficulty == true → HIGH",
    },
    {
        "id": "PR_FEVER_ELDERLY",
        "version": 1,
        "is_active": True,
        "resulting_flag": PriorityFlag.MEDIUM,
        "description": "fever_duration > 7 days AND age > 60 → MEDIUM",
    },
    {
        "id": "PR_SEVERE",
        "version": 1,
        "is_active": True,
        "resulting_flag": PriorityFlag.MEDIUM,
        "description": "severity == severe → MEDIUM",
    },
]

_PRIORITY_RANK = {
    PriorityFlag.NONE: 0,
    PriorityFlag.LOW: 1,
    PriorityFlag.MEDIUM: 2,
    PriorityFlag.HIGH: 3,
}


def detect_missing(fields: CollectedFields) -> list[str]:
    category = fields.complaint_category or _category_from_complaint(fields.chief_complaint)
    required = REQUIRED_FIELDS_BY_CATEGORY.get(category, REQUIRED_FIELDS_BY_CATEGORY["default"])
    missing: list[str] = []
    for field in required:
        if not fields.is_collected(field):
            missing.append(field)
    return missing


def _category_from_complaint(chief: str | None) -> str:
    if not chief:
        return "default"
    mapping = {
        "SYM_FEVER": "fever",
        "SYM_CHEST_PAIN": "chest_pain",
        "SYM_HEADACHE": "headache",
        "SYM_COUGH": "cough",
        "SYM_BREATHING": "chest_pain",
    }
    return mapping.get(chief, "default")


def _as_none_like(value: Any) -> bool:
    if value in (None, "unknown"):
        return False
    if value in ("none", "false", []):
        return True
    if isinstance(value, list) and len(value) == 0:
        return True
    return False


def _as_positive(value: Any) -> bool:
    if value in ("true", "yes"):
        return True
    if isinstance(value, list) and len(value) > 0:
        return True
    if isinstance(value, str) and value not in ("unknown", "none", "false", ""):
        return True
    return False


def conflict_rule(field: str, prior: Any, new: Any) -> bool:
    """Explicit field-level comparators (14 §5.2). Never auto-resolve."""
    if prior in (None, "unknown") or new in (None, "unknown"):
        return False
    if prior == new:
        return False

    if field in (
        "takes_medication",
        "has_allergy",
        "chest_pain",
        "breathing_difficulty",
        "fever",
        "vomiting",
        "headache",
    ):
        return {prior, new} == {"true", "false"}

    if field == "medications":
        prior_none = _as_none_like(prior)
        new_positive = _as_positive(new) and not _as_none_like(new)
        new_none = _as_none_like(new)
        prior_positive = _as_positive(prior) and not _as_none_like(prior)
        return (prior_none and new_positive) or (prior_positive and new_none)

    if field == "allergies":
        prior_none = prior in ("none", "false")
        new_none = new in ("none", "false")
        prior_named = isinstance(prior, str) and prior not in ("none", "unknown", "false")
        new_named = isinstance(new, str) and new not in ("none", "unknown", "false")
        return (prior_none and new_named) or (prior_named and new_none)

    if field == "severity":
        extremes = {"mild", "severe"}
        return {prior, new} == extremes

    if field in ("duration_days",) and isinstance(prior, int) and isinstance(new, int):
        # Duration going backwards implausibly (halved or more, and drop of ≥3 days)
        if prior >= 3 and new < prior and (prior - new) >= 3 and new * 2 <= prior:
            return True
        return False

    return False


def detect_contradictions(
    fields: CollectedFields,
    delta: dict[str, Any],
    turn_history: list[TurnRecord],
    current_turn_id: str,
) -> list[Contradiction]:
    found: list[Contradiction] = []
    for field, new_val in delta.items():
        if new_val is None or field in ("symptoms",):
            continue
        for prior_turn in turn_history:
            if prior_turn.speaker != "patient":
                continue
            prior_delta = prior_turn.extracted_delta or {}
            if field not in prior_delta:
                continue
            prior_val = prior_delta[field]
            if conflict_rule(field, prior_val, new_val):
                found.append(
                    Contradiction(
                        field=field,
                        statement_a=prior_val,
                        statement_b=new_val,
                        turn_refs=[prior_turn.turn_id, current_turn_id],
                    )
                )
        # Also compare against current collected state when history missed a merge
        current = getattr(fields, field, None) if hasattr(fields, field) else None
        if current is not None and conflict_rule(field, current, new_val):
            already = any(c.field == field and c.statement_b == new_val for c in found)
            if not already:
                found.append(
                    Contradiction(
                        field=field,
                        statement_a=current,
                        statement_b=new_val,
                        turn_refs=["collected", current_turn_id],
                    )
                )
    return found


def evaluate_priority(fields: CollectedFields) -> tuple[PriorityFlag, list[str]]:
    matched: list[str] = []
    flag = PriorityFlag.NONE

    def bump(new_flag: PriorityFlag, rule_id: str) -> None:
        nonlocal flag
        if _PRIORITY_RANK[new_flag] > _PRIORITY_RANK[flag]:
            flag = new_flag
        matched.append(rule_id)

    chest = fields.chest_pain == "true" or fields.chief_complaint == "SYM_CHEST_PAIN"
    breath = fields.breathing_difficulty == "true"
    if chest and breath:
        bump(PriorityFlag.HIGH, "PR_CHEST_BREATH")

    feverish = fields.fever == "true" or fields.chief_complaint == "SYM_FEVER"
    days = fields.duration_days
    if feverish and days is not None and days > 7 and fields.age is not None and fields.age > 60:
        bump(PriorityFlag.MEDIUM, "PR_FEVER_ELDERLY")

    if fields.severity == "severe":
        bump(PriorityFlag.MEDIUM, "PR_SEVERE")

    if flag == PriorityFlag.NONE and fields.chief_complaint:
        flag = PriorityFlag.LOW

    return flag, matched


def run_rule_engine(
    fields: CollectedFields,
    delta: dict[str, Any] | None = None,
    turn_history: list[TurnRecord] | None = None,
    current_turn_id: str = "",
) -> RuleEngineResult:
    delta = delta or {}
    history = turn_history or []
    missing = detect_missing(fields)
    contradictions = detect_contradictions(fields, delta, history, current_turn_id)
    priority, matched = evaluate_priority(fields)
    return RuleEngineResult(
        missing_fields=missing,
        contradictions=contradictions,
        priority_flag=priority,
        matched_rule_ids=matched,
    )
