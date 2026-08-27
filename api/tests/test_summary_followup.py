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
    assert summary["main_complaint"] == "ताप"
    assert "ताप" in summary["symptoms"]
    assert "डोकेदुखी" in summary["symptoms"]
    assert summary["current_medications"] == ["paracetamol"]
    assert summary["duration"] == "6 दिवस"
    assert summary["severity"] == "सौम्य"
    assert summary["patient_gender"] == "पुरुष"
    assert any("paracetamol" in o.casefold() or "औषध" in o for o in summary["observations"])
    assert all("Patient reports" not in o for o in summary["observations"])
    assert "एआय" in summary["ai_disclaimer"] or "एआई" in summary["ai_disclaimer"] or "निर्मित" in summary["ai_disclaimer"]


def test_hindi_summary_localizes_all_patient_fields():
    fields = CollectedFields(
        display_name="Vi",
        age=20,
        gender="female",
        chief_complaint="SYM_BODY_PAIN",
        duration="2 days",
        duration_days=2,
        severity="severe",
        medications=["dolo"],
        takes_medication="true",
        allergies="none",
        has_allergy="false",
    )
    summary = build_summary_from_fields(fields, "hi")
    assert summary["main_complaint"] == "शरीर में दर्द"
    assert summary["symptoms"] == ["शरीर में दर्द"]
    assert summary["duration"] == "2 दिन"
    assert summary["severity"] == "गंभीर"
    assert summary["patient_gender"] == "महिला"
    assert summary["current_medications"] == ["dolo"]
    assert summary["allergies"] == "none"
    assert any("शरीर में दर्द" in o for o in summary["observations"])
    assert any("dolo" in o for o in summary["observations"])
    assert any("एलर्जी" in o for o in summary["observations"])
    assert summary["recommended_next_steps"] == ["आराम करें", "पर्याप्त पानी पिएं", "डॉक्टर से सलाह लें"]
    assert "चिकित्सकीय निदान नहीं" in summary["ai_disclaimer"]


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


def test_merge_prefers_localized_grounded_summary_for_patients():
    fields = CollectedFields(
        display_name="Ravi",
        age=22,
        gender="male",
        chief_complaint="SYM_FEVER",
        fever="true",
        medications=["paracetamol"],
        takes_medication="true",
        duration_days=3,
        severity="mild",
    )
    # English LLM output must not leak into Hindi patient summary
    llm = {
        "main_complaint": "Fever",
        "symptoms": ["Fever", "Headache"],
        "duration": "3 days",
        "severity": "mild",
        "observations": ["Patient reports mild symptoms Fever for 3 days."],
        "recommended_next_steps": ["Rest", "Drink fluids"],
        "current_medications": [],
        "ai_disclaimer": "This is an AI-generated consultation summary...",
    }
    merged = merge_summary_with_fields(llm, fields, "hi")
    assert merged["main_complaint"] == "बुखार"
    assert "बुखार" in merged["symptoms"]
    assert merged["duration"] == "3 दिन"
    assert merged["severity"] == "हल्की"
    assert merged["patient_gender"] == "पुरुष"
    assert any("बुखार" in str(o) for o in merged["observations"])
    assert all("Patient reports" not in str(o) for o in merged["observations"])
    assert merged["current_medications"] == ["paracetamol"]
    assert merged["recommended_next_steps"][0] == "आराम करें"
    assert "चिकित्सकीय निदान नहीं" in merged["ai_disclaimer"]


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
            "turn_id": "turn-sum-cont",
            "input_type": "text",
            "content": "also vomiting since morning",
        },
        headers=h,
    ).json()
    updated = r2.get("consultation_summary") or prior
    # Marathi patient summary should not leave English symptom labels
    if updated.get("symptoms"):
        joined = " ".join(str(s) for s in updated["symptoms"])
        assert "Fever" not in joined or "ताप" in joined
