from core.question_engine import MAX_QUESTIONS, select_next_question
from core.schema import CollectedFields


def _patient(**kwargs) -> CollectedFields:
    base = dict(display_name="Ravi", age=30, gender="male")
    base.update(kwargs)
    return CollectedFields(**base)


def test_does_not_reask_collected_field():
    fields = _patient(
        chief_complaint="SYM_FEVER",
        complaint_category="fever",
        duration="3 days",
        duration_days=3,
    )
    q = select_next_question(fields, missing_fields=["severity"], question_count_so_far=1)
    assert q is not None
    assert q.field != "duration"


def test_chest_pain_branches_to_breathing():
    fields = _patient(
        chief_complaint="SYM_CHEST_PAIN",
        complaint_category="chest_pain",
        duration="1 day",
        duration_days=1,
    )
    q = select_next_question(fields, missing_fields=["breathing_difficulty"], question_count_so_far=2)
    assert q is not None
    assert q.field == "breathing_difficulty"


def test_max_question_cap_returns_none():
    fields = _patient(chief_complaint="SYM_FEVER", complaint_category="fever")
    q = select_next_question(fields, ["duration"], question_count_so_far=MAX_QUESTIONS)
    assert q is None


def test_prefers_missing_fields():
    fields = _patient(chief_complaint="SYM_FEVER", complaint_category="fever")
    q = select_next_question(fields, missing_fields=["allergies"], question_count_so_far=1)
    assert q is not None
    assert q.field == "allergies"


def test_yes_to_meds_prompts_name_once():
    fields = _patient(
        chief_complaint="SYM_FEVER",
        complaint_category="fever",
        duration="5 days",
        duration_days=5,
        severity="mild",
        takes_medication="true",
    )
    q = select_next_question(fields, missing_fields=["medications"], question_count_so_far=3)
    assert q is not None
    assert q.id == "Q_MED_NAME"
    assert q.field == "medications"
    # After name question already asked, do not offer another meds question
    q2 = select_next_question(
        fields,
        missing_fields=["medications"],
        question_count_so_far=4,
        asked_questions=["Q_MED_NAME:medications"],
    )
    assert q2 is None or q2.field != "medications"
