from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_severity_answer_does_not_loop():
    start = client.post(
        "/api/v1/session/start",
        json={"language": "en", "display_name": "Ravi", "age": 30, "gender": "male"},
    )
    assert start.status_code == 200
    sid, token = start.json()["session_id"], start.json()["token"]
    h = {"Authorization": f"Bearer {token}"}

    client.post(
        f"/api/v1/conversation/{sid}/turn",
        json={
            "turn_id": "turn-loop-0001",
            "input_type": "text",
            "content": "I have fever for 6 days",
        },
        headers=h,
    )
    # Force severity as pending by answering until severity is next, or seed pending
    # Direct path: send severity answer with pending set via a prior turn that asked it
    state = client.get(f"/api/v1/conversation/{sid}/state", headers=h).json()
    # Keep turning with non-severity answers until severity is asked, max 5
    for i in range(5):
        pending = client.post(
            f"/api/v1/conversation/{sid}/turn",
            json={
                "turn_id": f"turn-loop-prep-{i}",
                "input_type": "text",
                "content": "no medicines and no allergies, also cough",
            },
            headers=h,
        ).json()
        nxt = pending.get("next_question") or {}
        if nxt.get("field") == "severity" or pending["updated_fields"].get("severity") != "unknown":
            break

    # Explicit severity answer (the bug case)
    res = client.post(
        f"/api/v1/conversation/{sid}/turn",
        json={
            "turn_id": "turn-loop-mild",
            "input_type": "text",
            "content": "the pain is mild",
        },
        headers=h,
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["updated_fields"]["severity"] == "mild"
    nxt = body.get("next_question")
    assert nxt is None or nxt.get("field") != "severity"
    assert "mild, moderate, or severe" not in body["ai_message"].lower()
