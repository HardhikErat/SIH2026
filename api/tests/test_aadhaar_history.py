"""Aadhaar identity + returning-patient history for doctors."""

from fastapi.testclient import TestClient

from main import app

client = TestClient(app)

AADHAAR = "987654321098"


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _start(**overrides):
    body = {
        "language": "en",
        "display_name": "Ravi Kumar",
        "age": 40,
        "gender": "male",
        "aadhaar_number": AADHAAR,
        **overrides,
    }
    r = client.post("/api/v1/session/start", json=body)
    assert r.status_code == 200, r.text
    return r.json()


def _doctor_token() -> str:
    login = client.post("/api/v1/doctor/login", json={"email": "doctor@camp.local", "password": "camp-demo"})
    assert login.status_code == 200, login.text
    return login.json()["token"]


def test_invalid_aadhaar_rejected():
    r = client.post(
        "/api/v1/session/start",
        json={"language": "en", "display_name": "X", "age": 20, "gender": "male", "aadhaar_number": "123"},
    )
    assert r.status_code == 400
    body = r.json()
    err = body.get("error") or body.get("detail", {}).get("error") or {}
    assert err.get("code") == "INVALID_AADHAAR"


def test_returning_patient_reuses_identity_and_history_visible_to_doctor():
    first = _start()
    sid1, token1 = first["session_id"], first["token"]
    assert first["returning_patient"] is False
    assert first["aadhaar_masked"].endswith("1098")

    client.post(
        f"/api/v1/conversation/{sid1}/turn",
        json={
            "turn_id": "turn-aadhaar-0001",
            "input_type": "text",
            "content": "I have fever for 3 days, mild, no medicines, no allergies, also cough",
        },
        headers=_auth(token1),
    )
    conf1 = client.post(
        f"/api/v1/intake/{sid1}/confirm",
        json={"confirmed": True},
        headers=_auth(token1),
    )
    assert conf1.status_code == 200, conf1.text
    intake1 = conf1.json()["intake_id"]

    second = _start(display_name="Ravi Kumar", age=41)
    assert second["returning_patient"] is True
    assert second["prior_visit_count"] >= 1
    assert second["patient_id"] == first["patient_id"]

    sid2, token2 = second["session_id"], second["token"]
    client.post(
        f"/api/v1/conversation/{sid2}/turn",
        json={
            "turn_id": "turn-aadhaar-0002",
            "input_type": "text",
            "content": "Fever again for 2 days with body pain",
        },
        headers=_auth(token2),
    )
    conf2 = client.post(
        f"/api/v1/intake/{sid2}/confirm",
        json={"confirmed": True},
        headers=_auth(token2),
    )
    assert conf2.status_code == 200, conf2.text
    intake2 = conf2.json()["intake_id"]

    dtoken = _doctor_token()
    detail = client.get(f"/api/v1/doctor/intake/{intake2}", headers=_auth(dtoken))
    assert detail.status_code == 200, detail.text
    data = detail.json()
    assert data["prior_visit_count"] >= 1
    assert any(h["intake_id"] == intake1 for h in data["medical_history_timeline"])
    assert data["patient"]["aadhaar_masked"].endswith("1098")
    assert "historical_insights_overview" in data
    assert isinstance(data["historical_insights"], list)
    # Chat history persisted on prior intake
    prior = next(h for h in data["medical_history_timeline"] if h["intake_id"] == intake1)
    assert isinstance(prior.get("turn_history"), list)
    assert len(prior["turn_history"]) >= 1
