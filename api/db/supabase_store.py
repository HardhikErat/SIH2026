"""Supabase-backed store via PostgREST (httpx) — serverless-safe.

Avoids the full supabase-py client on Vercel (auth/realtime session storage has
caused ``[Errno 16] Device or resource busy`` during patient session start).
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from core.config import settings
from core.schema import IntakeStatus, SessionStatus
from db.demo_staff import authenticate_demo_staff

logger = logging.getLogger(__name__)

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

PATIENT_COLUMNS = {
    "display_name",
    "age",
    "gender",
    "preferred_language",
    "dialect_hint",
    "camp_id",
    "aadhaar_hash",
    "aadhaar_last4",
}

PATIENT_OPTIONAL_COLUMNS = ("aadhaar_hash", "aadhaar_last4", "dialect_hint", "camp_id")

INTAKE_COLUMNS = {
    "session_id",
    "patient_id",
    "aadhaar_hash",
    "aadhaar_last4",
    "chief_complaint",
    "duration",
    "symptoms",
    "medical_history",
    "medications",
    "allergies",
    "missing_information",
    "contradictions",
    "priority_flag",
    "ai_summary",
    "consultation_summary",
    "consultation_summary_en",
    "turn_history",
    "language",
    "status",
    "structured_fields",
    "doctor_id",
    "verified_at",
    "camp_id",
}


class SupabaseStore:
    def __init__(self) -> None:
        base = (settings.supabase_url or "").rstrip("/")
        if not base or not settings.supabase_service_role_key:
            raise RuntimeError("Supabase URL and service role key are required")
        self.rest_url = f"{base}/rest/v1"
        self._headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
        }

    def _request(
        self,
        method: str,
        path: str,
        *,
        json_body: Any = None,
        params: dict[str, str] | None = None,
        prefer: str | None = None,
        timeout: float = 25.0,
    ) -> Any:
        headers = dict(self._headers)
        if prefer:
            headers["Prefer"] = prefer
        url = f"{self.rest_url}/{path.lstrip('/')}"
        with httpx.Client(timeout=timeout) as client:
            response = client.request(method, url, headers=headers, params=params, json=json_body)
        if response.status_code >= 400:
            raise RuntimeError(
                f"PostgREST {method} {path} failed ({response.status_code}): {response.text[:400]}"
            )
        if response.status_code == 204 or not response.content:
            return None
        return response.json()

    def _select(
        self,
        table: str,
        *,
        filters: dict[str, str] | None = None,
        select: str = "*",
        order: str | None = None,
        limit: int | None = None,
    ) -> list[dict]:
        params: dict[str, str] = {"select": select}
        if filters:
            params.update(filters)
        if order:
            params["order"] = order
        if limit is not None:
            params["limit"] = str(limit)
        data = self._request("GET", table, params=params)
        return data if isinstance(data, list) else []

    def _insert(self, table: str, row: dict) -> dict:
        data = self._request("POST", table, json_body=row, prefer="return=representation")
        if isinstance(data, list) and data:
            return data[0]
        if isinstance(data, dict):
            return data
        raise RuntimeError(f"{table} insert returned no row")

    def _update(self, table: str, filters: dict[str, str], row: dict) -> list[dict]:
        data = self._request(
            "PATCH",
            table,
            json_body=row,
            params=filters,
            prefer="return=representation",
        )
        return data if isinstance(data, list) else ([] if data is None else [data])

    def _upsert(self, table: str, row: dict) -> dict:
        data = self._request(
            "POST",
            table,
            json_body=row,
            prefer="resolution=merge-duplicates,return=representation",
        )
        if isinstance(data, list) and data:
            return data[0]
        if isinstance(data, dict):
            return data
        return row

    def create_camp(self, name: str, location: str, organizer: str, start_date: str, end_date: str) -> dict:
        return self._insert(
            "camps",
            {
                "name": name,
                "location": location,
                "organizer": organizer,
                "start_date": start_date,
                "end_date": end_date,
            },
        )

    def get_camp(self, camp_id: str) -> dict | None:
        rows = self._select("camps", filters={"id": f"eq.{camp_id}"}, limit=1)
        return rows[0] if rows else None

    def create_patient(self, **kwargs: Any) -> dict:
        payload = {k: v for k, v in kwargs.items() if k in PATIENT_COLUMNS and v is not None}
        try:
            return self._insert("patients", payload)
        except Exception as first_err:  # noqa: BLE001
            trimmed = {k: v for k, v in payload.items() if k not in PATIENT_OPTIONAL_COLUMNS}
            if trimmed == payload:
                raise first_err
            logger.warning("Patient insert retry without optional columns: %s", first_err)
            return self._insert("patients", trimmed)

    def get_patient(self, patient_id: str) -> dict | None:
        rows = self._select("patients", filters={"id": f"eq.{patient_id}"}, limit=1)
        return rows[0] if rows else None

    def find_patient_by_aadhaar_hash(self, aadhaar_hash: str) -> dict | None:
        try:
            rows = self._select(
                "patients",
                filters={"aadhaar_hash": f"eq.{aadhaar_hash}"},
                limit=1,
            )
            return rows[0] if rows else None
        except Exception:  # noqa: BLE001 — column may be missing pre-migration
            return None

    def list_intakes_by_patient(
        self, patient_id: str, *, exclude_intake_id: str | None = None
    ) -> list[dict]:
        items = self._select(
            "intakes",
            filters={"patient_id": f"eq.{patient_id}"},
            order="created_at.desc",
        )
        if exclude_intake_id:
            items = [r for r in items if r.get("id") != exclude_intake_id]
        return items

    def list_intakes_by_aadhaar_hash(
        self, aadhaar_hash: str, *, exclude_intake_id: str | None = None
    ) -> list[dict]:
        try:
            items = self._select(
                "intakes",
                filters={"aadhaar_hash": f"eq.{aadhaar_hash}"},
                order="created_at.desc",
            )
        except Exception:  # noqa: BLE001
            return []
        if exclude_intake_id:
            items = [r for r in items if r.get("id") != exclude_intake_id]
        return items

    def update_patient(self, patient_id: str, **kwargs: Any) -> dict:
        payload = {k: v for k, v in kwargs.items() if k in PATIENT_COLUMNS and v is not None}
        try:
            rows = self._update("patients", {"id": f"eq.{patient_id}"}, payload)
            if rows:
                return rows[0]
        except Exception as first_err:  # noqa: BLE001
            trimmed = {k: v for k, v in payload.items() if k not in PATIENT_OPTIONAL_COLUMNS}
            if trimmed and trimmed != payload:
                rows = self._update("patients", {"id": f"eq.{patient_id}"}, trimmed)
                if rows:
                    return rows[0]
            raise first_err
        existing = self.get_patient(patient_id)
        if existing:
            existing.update(payload)
            return existing
        raise RuntimeError(f"Patient {patient_id} not found for update")

    def create_session(self, patient_id: str, camp_id: str | None = None) -> dict:
        payload = {
            "patient_id": patient_id,
            "status": SessionStatus.IN_PROGRESS.value,
            "collected_fields": {},
            "turn_history": [],
        }
        row = self._insert("sessions", payload)
        row["question_count"] = row.get("question_count") or 0
        row["language"] = row.get("language") or "en"
        if camp_id:
            row["camp_id"] = camp_id
        return row

    def get_session(self, session_id: str) -> dict | None:
        rows = self._select("sessions", filters={"id": f"eq.{session_id}"}, limit=1)
        return rows[0] if rows else None

    def save_session(self, session: dict) -> dict:
        sid = session["id"]
        payload = {
            k: v
            for k, v in session.items()
            if k != "id" and k in SESSION_COLUMNS and v is not None
        }
        if not payload:
            return session
        rows = self._update("sessions", {"id": f"eq.{sid}"}, payload)
        return rows[0] if rows else session

    def create_intake(self, row: dict) -> dict:
        payload = {k: v for k, v in row.items() if k in INTAKE_COLUMNS and v is not None}
        optional = (
            "consultation_summary_en",
            "camp_id",
            "turn_history",
            "language",
            "aadhaar_hash",
            "aadhaar_last4",
        )
        try:
            return self._insert("intakes", payload)
        except Exception as first_err:  # noqa: BLE001
            trimmed = dict(payload)
            dropped: list[str] = []
            for key in optional:
                if key in trimmed:
                    trimmed.pop(key, None)
                    dropped.append(key)
            if not dropped:
                raise first_err
            try:
                return self._insert("intakes", trimmed)
            except Exception as second_err:  # noqa: BLE001
                raise RuntimeError(
                    f"intake insert failed after dropping {dropped}: {second_err}"
                ) from second_err

    def get_intake(self, intake_id: str) -> dict | None:
        rows = self._select("intakes", filters={"id": f"eq.{intake_id}"}, limit=1)
        return rows[0] if rows else None

    def get_intake_by_session(self, session_id: str) -> dict | None:
        rows = self._select("intakes", filters={"session_id": f"eq.{session_id}"}, limit=1)
        return rows[0] if rows else None

    def save_intake(self, intake: dict) -> dict:
        iid = intake["id"]
        payload = {k: v for k, v in intake.items() if k != "id"}
        rows = self._update("intakes", {"id": f"eq.{iid}"}, payload)
        return rows[0] if rows else intake

    def list_queue(self, camp_id: str | None = None) -> list[dict]:
        items = self._select(
            "intakes",
            filters={"status": f"eq.{IntakeStatus.AI_GENERATED.value}"},
            select="*,patients(*),sessions(*)",
        )
        rank = {"HIGH": 0, "MEDIUM": 1, "LOW": 2, "NONE": 3}
        items.sort(key=lambda r: (rank.get(r.get("priority_flag") or "NONE", 9), r.get("created_at") or ""))
        return items

    def append_audit(
        self, intake_id: str, field_name: str, old_value: Any, new_value: Any, changed_by: str
    ) -> dict:
        return self._insert(
            "audit_log",
            {
                "intake_id": intake_id,
                "field_name": field_name,
                "old_value": old_value,
                "new_value": new_value,
                "changed_by": changed_by,
            },
        )

    def list_audit(self, intake_id: str) -> list[dict]:
        return self._select(
            "audit_log",
            filters={"intake_id": f"eq.{intake_id}"},
            order="changed_at.asc",
        )

    def add_asr_sample(self, row: dict) -> dict:
        return self._insert("asr_samples", row)

    def upsert_session_metrics(self, session_id: str, **kwargs: Any) -> dict:
        payload = {"session_id": session_id, **kwargs}
        try:
            return self._upsert("session_metrics", payload)
        except Exception:  # noqa: BLE001
            return payload

    def metrics_summary(self) -> dict:
        samples = self._select("asr_samples")
        metrics = self._select("session_metrics")
        intakes = self._select("intakes", select="status")
        audit = self._select("audit_log", select="field_name")
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
