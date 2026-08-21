"""End-to-end API smoke test against a running server."""

from __future__ import annotations

import sys

import httpx

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000/api/v1"


def main() -> None:
    with httpx.Client(base_url=BASE, timeout=30) as client:
        health = client.get("/health")
        assert health.status_code == 200, health.text

        start = client.post("/session/start", json={"language": "hi", "display_name": "E2E Patient"})
        assert start.status_code == 200, start.text
        data = start.json()
        sid, token = data["session_id"], data["token"]
        headers = {"Authorization": f"Bearer {token}"}

        turn = client.post(
            f"/conversation/{sid}/turn",
            json={
                "turn_id": "e2e-turn-0001",
                "input_type": "text",
                "content": "mujhe 3 days se bukhar hai, no medicines",
            },
            headers=headers,
        )
        assert turn.status_code == 200, turn.text
        assert turn.json()["updated_fields"]["chief_complaint"] == "SYM_FEVER"

        turn2 = client.post(
            f"/conversation/{sid}/turn",
            json={
                "turn_id": "e2e-turn-0002",
                "input_type": "text",
                "content": "I took my BP tablet this morning",
            },
            headers=headers,
        )
        assert turn2.status_code == 200, turn2.text
        assert turn2.json()["contradictions"], "Expected medication contradiction"

        confirm = client.post(f"/intake/{sid}/confirm", json={"confirmed": True}, headers=headers)
        assert confirm.status_code == 200, confirm.text
        intake_id = confirm.json()["intake_id"]
        assert confirm.json()["status"] == "AI_GENERATED"

        login = client.post("/doctor/login", json={"email": "doctor@camp.local", "password": "camp-demo"})
        assert login.status_code == 200, login.text
        dheaders = {"Authorization": f"Bearer {login.json()['token']}"}

        queue = client.get("/doctor/queue", headers=dheaders)
        assert queue.status_code == 200, queue.text
        assert any(q["intake_id"] == intake_id for q in queue.json()["queue"])

        patch = client.patch(
            f"/doctor/intake/{intake_id}",
            json={"fields": {"allergies": "none"}},
            headers=dheaders,
        )
        assert patch.status_code == 200, patch.text

        verify = client.post(
            f"/doctor/intake/{intake_id}/verify",
            json={"acknowledge_high_priority": False},
            headers=dheaders,
        )
        assert verify.status_code == 200, verify.text
        assert verify.json()["status"] == "DOCTOR_VERIFIED"

        langs = client.get("/languages")
        assert len(langs.json()["languages"]) >= 22

    print("E2E API smoke test passed.")


if __name__ == "__main__":
    main()
