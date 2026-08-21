"""In-memory persistence for tests and local demo. Production uses SupabaseStore."""

from __future__ import annotations

import threading
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from core.schema import IntakeStatus, SessionStatus


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class MemoryStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self.camps: dict[str, dict[str, Any]] = {}
        self.patients: dict[str, dict[str, Any]] = {}
        self.sessions: dict[str, dict[str, Any]] = {}
        self.intakes: dict[str, dict[str, Any]] = {}
        self.audit: list[dict[str, Any]] = []
        self.asr_samples: list[dict[str, Any]] = []
        self.session_metrics: dict[str, dict[str, Any]] = {}
        self.doctor_users: dict[str, dict[str, Any]] = {
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

    def create_camp(self, name: str, location: str, organizer: str, start_date: str, end_date: str) -> dict:
        camp_id = str(uuid4())
        row = {
            "id": camp_id,
            "name": name,
            "location": location,
            "organizer": organizer,
            "start_date": start_date,
            "end_date": end_date,
            "created_at": _now(),
        }
        with self._lock:
            self.camps[camp_id] = row
            for user in self.doctor_users.values():
                if user["camp_id"] is None:
                    user["camp_id"] = camp_id
        return row

    def get_camp(self, camp_id: str) -> dict | None:
        return self.camps.get(camp_id)

    def create_patient(self, **kwargs: Any) -> dict:
        pid = str(uuid4())
        row = {"id": pid, "created_at": _now(), **kwargs}
        self.patients[pid] = row
        return row

    def update_patient(self, patient_id: str, **kwargs: Any) -> dict:
        self.patients[patient_id].update(kwargs)
        return self.patients[patient_id]

    def create_session(self, patient_id: str, camp_id: str | None = None) -> dict:
        sid = str(uuid4())
        row = {
            "id": sid,
            "patient_id": patient_id,
            "camp_id": camp_id,
            "status": SessionStatus.IN_PROGRESS.value,
            "collected_fields": {},
            "turn_history": [],
            "pending_questions": [],
            "question_count": 0,
            "model_version": None,
            "language": "en",
            "dialect_hint": None,
            "audio_consent": False,
            "created_at": _now(),
            "updated_at": _now(),
        }
        self.sessions[sid] = row
        return row

    def get_session(self, session_id: str) -> dict | None:
        return self.sessions.get(session_id)

    def save_session(self, session: dict) -> dict:
        session["updated_at"] = _now()
        self.sessions[session["id"]] = session
        return session

    def create_intake(self, row: dict) -> dict:
        iid = row.get("id") or str(uuid4())
        row["id"] = iid
        row.setdefault("created_at", _now())
        row.setdefault("status", IntakeStatus.AI_GENERATED.value)
        self.intakes[iid] = row
        return row

    def get_intake(self, intake_id: str) -> dict | None:
        return self.intakes.get(intake_id)

    def get_intake_by_session(self, session_id: str) -> dict | None:
        for row in self.intakes.values():
            if row.get("session_id") == session_id:
                return row
        return None

    def save_intake(self, intake: dict) -> dict:
        self.intakes[intake["id"]] = intake
        return intake

    def list_queue(self, camp_id: str | None = None) -> list[dict]:
        rank = {"HIGH": 0, "MEDIUM": 1, "LOW": 2, "NONE": 3}
        items = []
        for intake in self.intakes.values():
            session = self.sessions.get(intake.get("session_id") or "")
            if not session or session.get("status") != SessionStatus.SUBMITTED.value:
                continue
            if intake.get("status") != IntakeStatus.AI_GENERATED.value:
                continue
            if camp_id and session.get("camp_id") and session.get("camp_id") != camp_id:
                continue
            patient = self.patients.get(intake.get("patient_id") or "")
            items.append({**intake, "patient": patient, "session": session})
        items.sort(key=lambda r: (rank.get(r.get("priority_flag") or "NONE", 9), r.get("created_at") or ""))
        return items

    def append_audit(self, intake_id: str, field_name: str, old_value: Any, new_value: Any, changed_by: str) -> dict:
        row = {
            "id": str(uuid4()),
            "intake_id": intake_id,
            "field_name": field_name,
            "old_value": old_value,
            "new_value": new_value,
            "changed_by": changed_by,
            "changed_at": _now(),
        }
        self.audit.append(row)
        return row

    def list_audit(self, intake_id: str) -> list[dict]:
        return [a for a in self.audit if a["intake_id"] == intake_id]

    def add_asr_sample(self, row: dict) -> dict:
        row = {"id": str(uuid4()), "created_at": _now(), **row}
        self.asr_samples.append(row)
        return row

    def upsert_session_metrics(self, session_id: str, **kwargs: Any) -> dict:
        current = self.session_metrics.get(session_id, {"session_id": session_id})
        current.update(kwargs)
        self.session_metrics[session_id] = current
        return current

    def metrics_summary(self) -> dict:
        samples = self.asr_samples
        wers: dict[str, list[float]] = {}
        for s in samples:
            if s.get("wer") is not None:
                wers.setdefault(s.get("language") or "unknown", []).append(float(s["wer"]))
        asr = {lang: (sum(v) / len(v) if v else None) for lang, v in wers.items()}
        completeness = [
            m.get("completeness_pct")
            for m in self.session_metrics.values()
            if m.get("completeness_pct") is not None
        ]
        edits = [a for a in self.audit if a["field_name"] != "status"]
        verified = [i for i in self.intakes.values() if i.get("status") == IntakeStatus.DOCTOR_VERIFIED.value]
        correction_rate = (len(edits) / max(len(verified), 1)) if verified else 0.0
        durations = [m.get("duration_seconds") for m in self.session_metrics.values() if m.get("duration_seconds")]
        return {
            "asr_wer_by_language": asr,
            "completeness_pct_avg": (sum(completeness) / len(completeness)) if completeness else 0,
            "doctor_correction_rate": correction_rate,
            "avg_session_seconds": (sum(durations) / len(durations)) if durations else 0,
            "intakes_submitted": len(
                [i for i in self.intakes.values() if i.get("status") in ("AI_GENERATED", "DOCTOR_VERIFIED")]
            ),
            "intakes_verified": len(verified),
        }

    def authenticate_staff(self, email: str, password: str) -> dict | None:
        user = self.doctor_users.get(email.lower())
        if user and user["password"] == password:
            return user
        return None

    def reset(self) -> None:
        with self._lock:
            self.camps.clear()
            self.patients.clear()
            self.sessions.clear()
            self.intakes.clear()
            self.audit.clear()
            self.asr_samples.clear()
            self.session_metrics.clear()
            self.doctor_users = {
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


store = MemoryStore()
