"""API contract tests including the unbypassable verify gate (12_Safety §1.2)."""

from fastapi.testclient import TestClient

from db.memory_store import MemoryStore
from db import supabase_client
from main import app

client = TestClient(app)


def _patient_session(language="en"):
    r = client.post("/api/v1/session/start", json={"language": language, "display_name": "Ravi"})
    assert r.status_code == 200, r.text
    data = r.json()
    return data["session_id"], data["token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_health():
    r = client.get("/api/v1/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_languages_include_22_scheduled_and_tiers():
    r = client.get("/api/v1/languages")
    langs = r.json()["languages"]
    codes = {x["code"] for x in langs}
    for required in ("hi", "mr", "en", "bn", "ta", "te", "gu", "kn", "ml", "pa", "or", "ur", "as", "sa"):
        assert required in codes
    hi = next(x for x in langs if x["code"] == "hi")
    sat = next(x for x in langs if x["code"] == "sat")
    assert hi["tier"] == 1
    assert sat["tier"] == 3


def test_text_turn_and_idempotency():
    sid, token = _patient_session()
    body = {"turn_id": "turn-aaaa-0001", "input_type": "text", "content": "I have fever for 3 days"}
    r1 = client.post(f"/api/v1/conversation/{sid}/turn", json=body, headers=_auth(token))
    assert r1.status_code == 200, r1.text
    r2 = client.post(f"/api/v1/conversation/{sid}/turn", json=body, headers=_auth(token))
    assert r2.json().get("idempotent") is True


def test_confirm_creates_ai_generated_not_verified():
    sid, token = _patient_session()
    client.post(
        f"/api/v1/conversation/{sid}/turn",
        json={"turn_id": "turn-bbbb-0001", "input_type": "text", "content": "chest pain and cannot breathe"},
        headers=_auth(token),
    )
    summary = client.get(f"/api/v1/intake/{sid}/summary", headers=_auth(token))
    assert summary.status_code == 200
    confirmed = client.post(f"/api/v1/intake/{sid}/confirm", json={"confirmed": True}, headers=_auth(token))
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()["status"] == "AI_GENERATED"


def test_only_verify_sets_doctor_verified():
    sid, token = _patient_session()
    client.post(
        f"/api/v1/conversation/{sid}/turn",
        json={"turn_id": "turn-cccc-0001", "input_type": "text", "content": "mild headache for 1 day"},
        headers=_auth(token),
    )
    confirmed = client.post(f"/api/v1/intake/{sid}/confirm", json={"confirmed": True}, headers=_auth(token)).json()
    intake_id = confirmed["intake_id"]
    login = client.post("/api/v1/doctor/login", json={"email": "doctor@camp.local", "password": "camp-demo"})
    assert login.status_code == 200, login.text
    dtoken = login.json()["token"]
    patched = client.patch(
        f"/api/v1/doctor/intake/{intake_id}",
        json={"fields": {"status": "DOCTOR_VERIFIED"}},
        headers=_auth(dtoken),
    )
    assert patched.status_code == 403
    verify = client.post(
        f"/api/v1/doctor/intake/{intake_id}/verify",
        json={"acknowledge_high_priority": False},
        headers=_auth(dtoken),
    )
    assert verify.status_code == 200, verify.text
    assert verify.json()["status"] == "DOCTOR_VERIFIED"


def test_high_priority_requires_ack():
    sid, token = _patient_session()
    client.post(
        f"/api/v1/conversation/{sid}/turn",
        json={"turn_id": "turn-dddd-0001", "input_type": "text", "content": "chest pain and cannot breathe"},
        headers=_auth(token),
    )
    intake_id = client.post(f"/api/v1/intake/{sid}/confirm", json={"confirmed": True}, headers=_auth(token)).json()[
        "intake_id"
    ]
    dtoken = client.post("/api/v1/doctor/login", json={"email": "doctor@camp.local", "password": "camp-demo"}).json()[
        "token"
    ]
    denied = client.post(
        f"/api/v1/doctor/intake/{intake_id}/verify",
        json={"acknowledge_high_priority": False},
        headers=_auth(dtoken),
    )
    assert denied.status_code == 409
    ok = client.post(
        f"/api/v1/doctor/intake/{intake_id}/verify",
        json={"acknowledge_high_priority": True},
        headers=_auth(dtoken),
    )
    assert ok.status_code == 200


def test_edit_writes_audit_log():
    sid, token = _patient_session()
    client.post(
        f"/api/v1/conversation/{sid}/turn",
        json={"turn_id": "turn-eeee-0001", "input_type": "text", "content": "fever for 2 days"},
        headers=_auth(token),
    )
    intake_id = client.post(f"/api/v1/intake/{sid}/confirm", json={"confirmed": True}, headers=_auth(token)).json()[
        "intake_id"
    ]
    dtoken = client.post("/api/v1/doctor/login", json={"email": "doctor@camp.local", "password": "camp-demo"}).json()[
        "token"
    ]
    client.patch(
        f"/api/v1/doctor/intake/{intake_id}",
        json={"fields": {"allergies": "none"}},
        headers=_auth(dtoken),
    )
    detail = client.get(f"/api/v1/doctor/intake/{intake_id}", headers=_auth(dtoken)).json()
    assert any(a["field_name"] == "allergies" for a in detail["audit_log"])


def test_patient_cannot_hit_doctor_queue():
    _, token = _patient_session()
    r = client.get("/api/v1/doctor/queue", headers=_auth(token))
    assert r.status_code == 403
