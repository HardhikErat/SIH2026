"""Supabase-backed store mirroring MemoryStore (07_DB_Architecture)."""

from __future__ import annotations

from typing import Any

from supabase import create_client

from core.config import settings
from core.schema import IntakeStatus, SessionStatus
from db.demo_staff import authenticate_demo_staff

SESSION_COLUMNS = {
    "patient_id",
    "status",
    "collected_fields",
    "turn_history",
    "pending_questions",
    "question_count",
    "missing_fields",
    "contradictions",
    "priority_flag",
    "language",
    "dialect_hint",
    "model_version",
    "audio_consent",
    "updated_at",
}


class SupabaseStore:
    def __init__(self) -> None:
        self.client = create_client(settings.supabase_url, settings.supabase_service_role_key)

    def create_camp(self, name: str, location: str, organizer: str, start_date: str, end_date: str) -> dict:
        res = (
            self.client.table("camps")
            .insert(
                {
                    "name": name,
                    "location": location,
                    "organizer": organizer,
                    "start_date": start_date,
                    "end_date": end_date,
                }
            )
            .execute()
        )
        return res.data[0]

    def get_camp(self, camp_id: str) -> dict | None:
        res = self.client.table("camps").select("*").eq("id", camp_id).limit(1).execute()
        return res.data[0] if res.data else None

    def create_patient(self, **kwargs: Any) -> dict:
        res = self.client.table("patients").insert(kwargs).execute()
        return res.data[0]

    def get_patient(self, patient_id: str) -> dict | None:
        res = self.client.table("patients").select("*").eq("id", patient_id).limit(1).execute()
        return res.data[0] if res.data else None

    def find_patient_by_aadhaar_hash(self, aadhaar_hash: str) -> dict | None:
        res = (
            self.client.table("patients")
            .select("*")
            .eq("aadhaar_hash", aadhaar_hash)
            .limit(1)
            .execute()
        )
        return res.data[0] if res.data else None

    def list_intakes_by_patient(
        self, patient_id: str, *, exclude_intake_id: str | None = None
    ) -> list[dict]:
        q = (
            self.client.table("intakes")
            .select("*")
            .eq("patient_id", patient_id)
            .order("created_at", desc=True)
        )
        items = q.execute().data or []
        if exclude_intake_id:
            items = [r for r in items if r.get("id") != exclude_intake_id]
        return items

    def list_intakes_by_aadhaar_hash(
        self, aadhaar_hash: str, *, exclude_intake_id: str | None = None
    ) -> list[dict]:
        q = (
            self.client.table("intakes")
            .select("*")
            .eq("aadhaar_hash", aadhaar_hash)
            .order("created_at", desc=True)
        )
        items = q.execute().data or []
        if exclude_intake_id:
            items = [r for r in items if r.get("id") != exclude_intake_id]
        return items

    def update_patient(self, patient_id: str, **kwargs: Any) -> dict:
        res = self.client.table("patients").update(kwargs).eq("id", patient_id).execute()
        return res.data[0]

    def create_session(self, patient_id: str, camp_id: str | None = None) -> dict:
        payload = {
            "patient_id": patient_id,
            "status": SessionStatus.IN_PROGRESS.value,
            "collected_fields": {},
            "turn_history": [],
        }
        res = self.client.table("sessions").insert(payload).execute()
        row = res.data[0]
        row["question_count"] = row.get("question_count") or 0
        row["language"] = row.get("language") or "en"
        if camp_id:
            row["camp_id"] = camp_id
        return row

    def get_session(self, session_id: str) -> dict | None:
        res = self.client.table("sessions").select("*").eq("id", session_id).limit(1).execute()
        return res.data[0] if res.data else None

    def save_session(self, session: dict) -> dict:
        sid = session["id"]
        payload = {
            k: v
            for k, v in session.items()
            if k != "id" and k in SESSION_COLUMNS and v is not None
        }
        res = self.client.table("sessions").update(payload).eq("id", sid).execute()
        return res.data[0] if res.data else session

    def create_intake(self, row: dict) -> dict:
        res = self.client.table("intakes").insert(row).execute()
        return res.data[0]

    def get_intake(self, intake_id: str) -> dict | None:
        res = self.client.table("intakes").select("*").eq("id", intake_id).limit(1).execute()
        return res.data[0] if res.data else None

    def get_intake_by_session(self, session_id: str) -> dict | None:
        res = self.client.table("intakes").select("*").eq("session_id", session_id).limit(1).execute()
        return res.data[0] if res.data else None

    def save_intake(self, intake: dict) -> dict:
        iid = intake["id"]
        payload = {k: v for k, v in intake.items() if k != "id"}
        res = self.client.table("intakes").update(payload).eq("id", iid).execute()
        return res.data[0] if res.data else intake

    def list_queue(self, camp_id: str | None = None) -> list[dict]:
        res = (
            self.client.table("intakes")
            .select("*, patients(*), sessions(*)")
            .eq("status", IntakeStatus.AI_GENERATED.value)
            .execute()
        )
        items = res.data or []
        rank = {"HIGH": 0, "MEDIUM": 1, "LOW": 2, "NONE": 3}
        items.sort(key=lambda r: (rank.get(r.get("priority_flag") or "NONE", 9), r.get("created_at") or ""))
        return items

    def append_audit(self, intake_id: str, field_name: str, old_value: Any, new_value: Any, changed_by: str) -> dict:
        res = (
            self.client.table("audit_log")
            .insert(
                {
                    "intake_id": intake_id,
                    "field_name": field_name,
                    "old_value": old_value,
                    "new_value": new_value,
                    "changed_by": changed_by,
                }
            )
            .execute()
        )
        return res.data[0]

    def list_audit(self, intake_id: str) -> list[dict]:
        res = (
            self.client.table("audit_log")
            .select("*")
            .eq("intake_id", intake_id)
            .order("changed_at")
            .execute()
        )
        return res.data or []

    def add_asr_sample(self, row: dict) -> dict:
        res = self.client.table("asr_samples").insert(row).execute()
        return res.data[0]

    def upsert_session_metrics(self, session_id: str, **kwargs: Any) -> dict:
        payload = {"session_id": session_id, **kwargs}
        res = self.client.table("session_metrics").upsert(payload).execute()
        return res.data[0] if res.data else payload

    def metrics_summary(self) -> dict:
        samples = self.client.table("asr_samples").select("*").execute().data or []
        metrics = self.client.table("session_metrics").select("*").execute().data or []
        intakes = self.client.table("intakes").select("status").execute().data or []
        audit = self.client.table("audit_log").select("field_name").execute().data or []
        wers: dict[str, list[float]] = {}
        for s in samples:
            if s.get("wer") is not None:
                wers.setdefault(s.get("language") or "unknown", []).append(float(s["wer"]))
        completeness = [m.get("completeness_pct") for m in metrics if m.get("completeness_pct") is not None]
        verified = [i for i in intakes if i.get("status") == IntakeStatus.DOCTOR_VERIFIED.value]
        edits = [a for a in audit if a.get("field_name") != "status"]
        durations = [m.get("duration_seconds") for m in metrics if m.get("duration_seconds")]
        return {
            "asr_wer_by_language": {k: sum(v) / len(v) for k, v in wers.items()},
            "completeness_pct_avg": (sum(completeness) / len(completeness)) if completeness else 0,
            "doctor_correction_rate": (len(edits) / max(len(verified), 1)) if verified else 0,
            "avg_session_seconds": (sum(durations) / len(durations)) if durations else 0,
            "intakes_submitted": len(intakes),
            "intakes_verified": len(verified),
        }

    def authenticate_staff(self, email: str, password: str) -> dict | None:
        return authenticate_demo_staff(email, password)
