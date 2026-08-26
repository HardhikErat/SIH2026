"""Context-aware conversation memory — duplicate prevention & multi-fact extraction."""

from core.conversation_memory import (
    build_memory,
    infer_implied_fields,
    is_field_answered,
    resolve_field_intent,
    should_ask_question,
)
from core.llm_gateway import KeywordStubProvider, LLMGateway
from core.normalization import normalize_fields
from core.question_engine import QUESTION_BANK, select_next_question
from core.schema import CollectedFields, Question


def _with_basics(**kwargs) -> CollectedFields:
    base = dict(display_name="Ravi", age=30, gender="male")
    base.update(kwargs)
    return CollectedFields(**base)


def _extract(utterance: str, fields: CollectedFields | None = None) -> CollectedFields:
    gw = LLMGateway(providers=[KeywordStubProvider()])
    fields = fields or _with_basics()
    delta = gw.extract(utterance, fields, "en")
    merged = fields.merge_delta(delta.model_dump(exclude_none=True))
    merged, _ = normalize_fields(merged)
    return infer_implied_fields(merged)


def test_semantic_duration_intent_maps_to_field():
    assert resolve_field_intent("how_many_days") == "duration"
    assert resolve_field_intent("kitne_din") == "duration"
    assert resolve_field_intent("duration") == "duration"


def test_duration_days_answers_duration_question():
    fields = _with_basics(duration_days=4)
    assert is_field_answered(fields, "duration") is True
    assert is_field_answered(fields, "how_long") is True


def test_1_sick_for_4_days_does_not_reask_duration():
    """Test 1: duration already in message → never ask how many days."""
    fields = _extract("I've been sick for 4 days.")
    assert fields.duration_days == 4
    q = select_next_question(fields, missing_fields=["duration", "medications"], question_count_so_far=1)
    assert q is None or q.field != "duration"
    assert "days" not in (q.question_text.get("en", "").lower() if q else "")


def test_2_multi_fact_fever_and_headache_stored():
    """Test 2: multiple facts in one utterance are all stored."""
    fields = _extract("I've been sick for 4 days and I have a headache since yesterday.")
    assert fields.duration_days == 4
    assert fields.headache == "true" or any(s.concept_id == "SYM_HEADACHE" for s in fields.symptoms)
    concepts = {s.concept_id for s in fields.symptoms}
    assert "SYM_HEADACHE" in concepts or fields.headache == "true"


def test_3_followup_symptoms_fever_and_headache():
    """Test 3: after duration known, symptoms message fills both without re-asking duration."""
    fields = _extract("I've been sick for 4 days.")
    fields = _extract("Fever and headache.", fields)
    assert fields.duration_days == 4
    assert fields.fever == "true" or fields.chief_complaint == "SYM_FEVER"
    assert fields.headache == "true" or any(s.concept_id == "SYM_HEADACHE" for s in fields.symptoms)
    q = select_next_question(
        fields,
        missing_fields=["severity", "medications", "allergies"],
        question_count_so_far=2,
    )
    assert q is None or q.field != "duration"


def test_4_correction_updates_duration():
    """Test 4: later correction overwrites duration."""
    fields = _extract("I've had fever for 4 days.")
    assert fields.duration_days == 4
    fields = _extract("Actually 5 days.", fields)
    assert fields.duration_days == 5
    assert fields.duration == "5 days"


def test_5_complete_first_message_skips_unnecessary_questions():
    """Test 5: all required fever fields in one message → no duration/assoc re-ask."""
    fields = _extract(
        "I have fever for 3 days, mild, taking paracetamol, no allergies, also cough and headache"
    )
    assert fields.duration_days == 3
    assert fields.fever == "true" or fields.chief_complaint == "SYM_FEVER"
    assert fields.associated_symptoms_checked == "true" or len(fields.symptoms) >= 1
    q = select_next_question(
        fields,
        missing_fields=[],
        question_count_so_far=1,
    )
    # Should not ask duration or associated symptoms again
    if q is not None:
        assert q.field not in ("duration", "associated_symptoms_checked")


def test_6_semantic_wording_still_recognized():
    """Test 6: Hinglish / alternate wording still extracts duration."""
    fields = _extract("4 din se bimaar hu")
    assert fields.duration_days == 4
    fields2 = _extract("kal se headache hai")
    assert fields2.duration_days == 1
    assert fields2.headache == "true" or fields2.chief_complaint == "SYM_HEADACHE"


def test_should_not_ask_when_field_collected():
    fields = _with_basics(duration="4 days", duration_days=4, chief_complaint="SYM_FEVER", complaint_category="fever")
    q = Question(
        id="Q_DURATION",
        complaint_category="*",
        field="duration",
        question_text_key="ask_duration",
        question_text={"en": "How many days?"},
    )
    assert should_ask_question(q, fields, []) is False


def test_memory_marks_complete():
    fields = _with_basics(
        chief_complaint="SYM_FEVER",
        complaint_category="fever",
        duration="3 days",
        duration_days=3,
        severity="mild",
        medications="none",
        allergies="none",
        associated_symptoms_checked="true",
    )
    memory = build_memory(fields, missing_fields=[], asked_questions=["Q_DURATION:duration"], conversation_complete=True)
    assert memory.conversation_complete is True
    assert "duration" in memory.collected_information
    assert "duration" in memory.answered_questions
    assert memory.missing_information == []


def test_infer_associated_from_symptoms_list():
    fields = _with_basics(
        chief_complaint="SYM_FEVER",
        complaint_category="fever",
        fever="true",
        symptoms=[{"concept_id": "SYM_HEADACHE", "severity": "unknown"}],
    )
    inferred = infer_implied_fields(fields)
    assert inferred.associated_symptoms_checked == "true"
    assert inferred.headache == "true"


def test_question_bank_duration_skipped_when_known():
    fields = _with_basics(
        chief_complaint="SYM_FEVER",
        complaint_category="fever",
        duration="4 days",
        duration_days=4,
    )
    q = select_next_question(fields, ["severity"], 1, bank=QUESTION_BANK)
    assert q is not None
    assert q.field == "severity"
