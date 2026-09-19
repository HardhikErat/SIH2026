"""Document upload → clinical fact extraction."""

import base64

from fastapi.testclient import TestClient

from core.document_extract import (
    build_document_utterance,
    extract_clinical_from_document,
    extract_document_text,
)
from core.schema import CollectedFields
from main import app

client = TestClient(app)


def _patient_session():
    r = client.post(
        "/api/v1/session/start",
        json={
            "language": "en",
            "display_name": "Ravi",
            "age": 34,
            "gender": "male",
            "aadhaar_number": "234567890123",
        },
    )
    assert r.status_code == 200, r.text
    data = r.json()
    return data["session_id"], data["token"]


def test_extract_plain_text_document():
    text = "Patient has fever for 3 days. Taking paracetamol. BP 120/80. Hb 11.2 g/dL."
    b64 = base64.b64encode(text.encode("utf-8")).decode("ascii")
    parsed = extract_document_text(
        filename="notes.txt",
        mime_type="text/plain",
        document_base64=b64,
        language="en",
    )
    assert "fever" in parsed["text"].lower()
    extracted = extract_clinical_from_document(parsed["text"], CollectedFields(), "en")
    assert extracted["key_facts"]
    assert extracted["clinical_delta"].get("chief_complaint") == "SYM_FEVER"
    assert "paracetamol" in str(extracted["clinical_delta"].get("medications")).lower()


def test_build_document_utterance_includes_facts():
    u = build_document_utterance("lab.pdf", ["Hb 9.2", "Fever noted"], "unused")
    assert "lab.pdf" in u
    assert "Hb 9.2" in u


def test_document_turn_updates_intake():
    sid, token = _patient_session()
    body_text = (
        "Lab report\n"
        "Fever for 4 days\n"
        "Medicines: Metformin\n"
        "History of diabetes\n"
        "BP 140/90\n"
    )
    b64 = base64.b64encode(body_text.encode("utf-8")).decode("ascii")
    r = client.post(
        f"/api/v1/conversation/{sid}/turn",
        json={
            "turn_id": "turn-doc-0001",
            "input_type": "document",
            "document_filename": "camp-lab.txt",
            "document_mime_type": "text/plain",
            "document_base64": b64,
            "language": "en",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("document_filename") == "camp-lab.txt"
    assert data.get("document_facts")
    assert any(c.get("field") == "attached_document" for c in (data.get("fact_chips") or []))
    fields = data.get("updated_fields") or {}
    hist = fields.get("medical_history") or []
    assert isinstance(hist, list)
    assert any("From document:" in str(h) for h in hist)
    assert "ai_message" in data and data["ai_message"]


def test_document_turn_rejects_empty():
    sid, token = _patient_session()
    r = client.post(
        f"/api/v1/conversation/{sid}/turn",
        json={
            "turn_id": "turn-doc-empty",
            "input_type": "document",
            "document_filename": "empty.txt",
            "document_mime_type": "text/plain",
            "document_base64": base64.b64encode(b"   ").decode("ascii"),
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 422
