"""Demo camp staff credentials (local + production until Supabase Auth OTP is wired)."""

from __future__ import annotations

from typing import Any

DEMO_STAFF: dict[str, dict[str, Any]] = {
    "doctor@camp.local": {
        "id": "00000000-0000-0000-0000-0000000000d1",
        "email": "doctor@camp.local",
        "password": "camp-demo",
        "role": "doctor",
        "camp_id": None,
    },
    "admin@camp.local": {
        "id": "00000000-0000-0000-0000-0000000000a1",
        "email": "admin@camp.local",
        "password": "camp-demo",
        "role": "admin",
        "camp_id": None,
    },
}


def authenticate_demo_staff(email: str, password: str) -> dict[str, Any] | None:
    user = DEMO_STAFF.get(email.lower())
    if user and user["password"] == password:
        return user
    return None
