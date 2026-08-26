"""Regression: short answers must update fields and advance the question."""

from core.question_engine import select_next_question
from core.schema import CollectedFields
from core.utterance_enrichment import enrich_utterance_delta


def _patient(**kwargs) -> CollectedFields:
    base = dict(
        display_name="Ravi",
        age=30,
        gender="male",
        aadhaar_last4="0123",
        chief_complaint="SYM_FEVER",
        complaint_category="fever",
        duration="6 days",
        duration_days=6,
        fever="true",
    )
    base.update(kwargs)
    return CollectedFields(**base)


def test_pain_is_mild_sets_severity_when_pending():
    delta = enrich_utterance_delta(
        "the pain is mild",
        {},
        pending_field="severity",
        collected=_patient(),
    )
    assert delta["severity"] == "mild"


def test_bare_mild_sets_severity():
    delta = enrich_utterance_delta("mild", {}, pending_field="severity")
    assert delta["severity"] == "mild"


def test_severity_loop_broken_after_enrichment():
    fields = _patient()
    delta = enrich_utterance_delta(
        "the pain is mild",
        {},
        pending_field="severity",
        collected=fields,
    )
    merged = fields.merge_delta(delta)
    assert merged.severity == "mild"
    q = select_next_question(
        merged,
        missing_fields=["severity", "medications", "allergies"],
        question_count_so_far=3,
    )
    assert q is None or q.field != "severity"


def test_no_nothing_clears_medications_when_pending():
    delta = enrich_utterance_delta("no nothing", {}, pending_field="medications")
    assert delta["medications"] == "none"
    assert delta["takes_medication"] == "false"


def test_yes_taking_meds_asks_for_name_not_complete():
    delta = enrich_utterance_delta(
        "yes i am taking medicines",
        {},
        pending_field="medications",
    )
    assert delta.get("takes_medication") == "true"
    assert "medications" not in delta or delta.get("medications") in (None, "unknown")


def test_dont_remember_med_name_after_yes():
    from core.schema import CollectedFields
    from core.utterance_enrichment import close_medication_name_if_declined

    fields = CollectedFields(
        display_name="Ravi",
        age=30,
        gender="male",
        takes_medication="true",
    )
    delta = enrich_utterance_delta(
        "I don't remember",
        {},
        pending_field="medications",
        collected=fields,
    )
    merged = fields.merge_delta(delta)
    if not merged.is_collected("medications"):
        merged = close_medication_name_if_declined(
            "I don't remember",
            merged,
            pending_field="medications",
            asked_questions=["Q_MED_NAME:medications"],
        )
    assert merged.medications == "unspecified"
    assert merged.takes_medication == "true"


def test_associated_no_nothing_marks_checked():
    delta = enrich_utterance_delta(
        "no nothing",
        {},
        pending_field="associated_symptoms_checked",
    )
    assert delta["associated_symptoms_checked"] == "true"


def test_llm_missed_severity_still_enriched():
    # Simulates live LLM returning empty delta while phrasing "heard" mild
    delta = enrich_utterance_delta(
        "the pain is mild",
        {},
        pending_field="severity",
        collected=_patient(severity="unknown"),
    )
    assert delta.get("severity") == "mild"
