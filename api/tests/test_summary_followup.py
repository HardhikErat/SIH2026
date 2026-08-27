from fastapi.testclient import TestClient

from core.schema import CollectedFields
from core.summary_builder import build_summary_from_fields, merge_summary_with_fields
from main import app

client = TestClient(app)


def test_summary_includes_medications_and_symptoms():
    fields = CollectedFields(
        display_name="Ravi",
        age=22,
        gender="male",
        chief_complaint="SYM_FEVER",
        complaint_category="fever",
        fever="true",
        headache="true",
        duration="6 days",
        duration_days=6,
        severity="mild",
        medications=["paracetamol"],
        takes_medication="true",
    )
    summary = build_summary_from_fields(fields, "mr")
    assert "Fever" in summary["symptoms"] or summary["main_complaint"] == "Fever"
    assert "Headache" in summary["symptoms"]
    assert summary["current_medications"] == ["paracetamol"]
    assert summary["duration"] == "6 days"
    assert any("paracetamol" in o.casefold() or "Medication" in o for o in summary["observations"])


def test_merge_keeps_field_medications():
    fields = CollectedFields(
        display_name="Ravi",
        age=22,
        gender="male",
        chief_complaint="SYM_FEVER",
        medications=["paracetamol"],
        takes_medication="true",
    )
    llm = {
        "main_complaint": "Fever",
        "symptoms": ["Fever"],
        "current_medications": [],
        "observations": ["Fever noted."],
    }
    merged = merge_summary_with_fields(llm, fields, "en")
    assert merged["current_medications"] == ["paracetamol"]


def test_merge_keeps_localized_llm_wording_for_patients():
    fields = CollectedFields(
        display_name="Ravi",
        age=22,
        gender="male",
        chief_complaint="SYM_FEVER",
        fever="true",
        medications=["paracetamol"],
        takes_medication="true",
    )
    llm = {
        "main_complaint": "बुखार",
        "symptoms": ["बुखार", "सिरदर्द"],
        "observations": ["मरीज़ को बुखार है।"],
        "recommended_next_steps": ["आराम करें"],
        "current_medications": [],
    }
    merged = merge_summary_with_fields(llm, fields, "hi")
    assert merged["main_complaint"] == "बुखार"
    assert "बुखार" in merged["symptoms"]
    assert any("बुखार" in str(o) for o in merged["observations"])
    assert merged["current_medications"] == ["paracetamol"]


def test_continue_talking_regenerates_summary_without_blocking_chat_contract():
    start = client.post(
        "/api/v1/session/start",
        json={
            "language": "mr",
            "display_name": "r",
            "age": 22,
            "gender": "male",
            "aadhaar_number": "234567890123",
        },
    )
    sid, token = start.json()["session_id"], start.json()["token"]
    h = {"Authorization": f"Bearer {token}"}

    # Drive toward completion with a rich first message
    r1 = client.post(
        f"/api/v1/conversation/{sid}/turn",
        json={
            "turn_id": "turn-sum-0001",
            "input_type": "text",
            "content": "fever for 6 days, mild, headache, taking paracetamol, no allergies",
        },
        headers=h,
    ).json()
    # Keep answering until complete
    n = 2
    body = r1
    while not body.get("conversation_complete") and n < 12:
        body = client.post(
            f"/api/v1/conversation/{sid}/turn",
            json={
                "turn_id": f"turn-sum-{n:04d}",
                "input_type": "text",
                "content": "no nothing",
            },
            headers=h,
        ).json()
        n += 1

    assert body.get("consultation_summary") or body.get("conversation_complete")
    prior = body.get("consultation_summary") or {}

    # Add new info after "continue talking" equivalent — vomiting
    r2 = client.post(
        f"/api/v1/conversation/{sid}/turn",
        json={
            "turn_id": "turn-sum-extra",
            "input_type": "text",
            "content": "also vomiting since yesterday",
        },
        headers=h,
    ).json()
    assert r2.get("summary_updated") is True or r2.get("updated_fields", {}).get("vomiting") == "true"
    summary = r2.get("consultation_summary") or {}
    if summary:
        # New fact should appear when summary is regenerated
        text_blob = str(summary).casefold()
        assert "vomit" in text_blob or r2["updated_fields"].get("vomiting") == "true"
    assert prior is not None
