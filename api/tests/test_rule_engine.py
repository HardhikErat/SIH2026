from core.schema import CollectedFields, TurnRecord
from core.rule_engine import (
    conflict_rule,
    detect_contradictions,
    detect_missing,
    evaluate_priority,
    run_rule_engine,
)
from core.schema import PriorityFlag


def test_missing_fever_checklist():
    fields = CollectedFields(chief_complaint="SYM_FEVER", complaint_category="fever", fever="true")
    missing = detect_missing(fields)
    assert "duration" in missing
    assert "allergies" in missing
    assert "medications" in missing


def test_unknown_not_treated_as_collected():
    fields = CollectedFields(allergies="unknown", medications="unknown")
    assert fields.is_collected("allergies") is False
    assert fields.is_collected("medications") is False


def test_none_allergies_is_collected():
    fields = CollectedFields(allergies="none", has_allergy="false")
    assert fields.is_collected("allergies") is True


def test_contradiction_no_meds_then_bp_tablet():
    prior = TurnRecord(
        turn_id="t1",
        speaker="patient",
        text="no medicines",
        extracted_delta={"medications": "none", "takes_medication": "false"},
    )
    fields = CollectedFields(medications="none", takes_medication="false")
    delta = {"medications": ["BP tablet"], "takes_medication": "true"}
    found = detect_contradictions(fields, delta, [prior], "t2")
    assert any(c.field == "medications" for c in found)
    assert found[0].turn_refs == ["t1", "t2"]


def test_contradiction_never_auto_resolves_prior():
    fields = CollectedFields(medications="none")
    delta = {"medications": ["paracetamol"]}
    history = [
        TurnRecord(turn_id="a", speaker="patient", text="none", extracted_delta={"medications": "none"})
    ]
    found = detect_contradictions(fields, delta, history, "b")
    assert found
    assert fields.medications == "none"


def test_no_contradiction_when_unknown():
    assert conflict_rule("takes_medication", "unknown", "true") is False
    assert conflict_rule("allergies", "unknown", "none") is False


def test_severity_mild_vs_severe():
    assert conflict_rule("severity", "mild", "severe") is True
    assert conflict_rule("severity", "mild", "moderate") is False


def test_duration_backwards():
    assert conflict_rule("duration_days", 10, 2) is True
    assert conflict_rule("duration_days", 3, 2) is False


def test_priority_chest_and_breathing_is_high():
    fields = CollectedFields(chest_pain="true", breathing_difficulty="true")
    flag, matched = evaluate_priority(fields)
    assert flag == PriorityFlag.HIGH
    assert "PR_CHEST_BREATH" in matched


def test_priority_never_from_prose_only():
    fields = CollectedFields()
    flag, _ = evaluate_priority(fields)
    assert flag == PriorityFlag.NONE


def test_priority_elderly_fever():
    fields = CollectedFields(
        chief_complaint="SYM_FEVER",
        fever="true",
        duration_days=10,
        age=72,
    )
    flag, matched = evaluate_priority(fields)
    assert flag == PriorityFlag.MEDIUM
    assert "PR_FEVER_ELDERLY" in matched


def test_run_rule_engine_combines():
    fields = CollectedFields(
        chief_complaint="SYM_CHEST_PAIN",
        complaint_category="chest_pain",
        chest_pain="true",
        breathing_difficulty="true",
    )
    result = run_rule_engine(fields, delta={"chest_pain": "true"})
    assert result.priority_flag == PriorityFlag.HIGH
    assert "duration" in result.missing_fields


def test_schema_rejects_bool_clinical_flag():
    import pytest
    from pydantic import ValidationError

    with pytest.raises(ValidationError):
        CollectedFields.model_validate({"has_allergy": True})
