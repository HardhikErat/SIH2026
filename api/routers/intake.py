from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from auth.supabase_auth import require_patient, require_staff
from core.aadhaar import aadhaar_hash, aadhaar_last4, normalize_aadhaar
from core.errors import ApiException
from core.llm_gateway import gateway
from core.rule_engine import run_rule_engine
from core.schema import CollectedFields, IntakeStatus, SessionStatus
from db.supabase_client import get_store

router = APIRouter()

# 07_DB / 12_Safety: only verify endpoint may set DOCTOR_VERIFIED.
_VERIFY_ONLY_STATUS = IntakeStatus.DOCTOR_VERIFIED.value


class ConfirmBody(BaseModel):
    confirmed: bool = True


def _completeness(fields: CollectedFields, missing: list[str]) -> float:
    tracked = [
        "chief_complaint",
        "duration",
        "severity",
        "medications",
        "allergies",
    ]
    filled = sum(1 for f in tracked if fields.is_collected(f))
    return round(100.0 * filled / len(tracked), 2)


@router.get("/intake/{session_id}/summary")
def patient_summary(session_id: str, principal: dict = Depends(require_patient)) -> dict:
    store = get_store()
    session = store.get_session(session_id)
    if not session:
        raise ApiException(404, "SESSION_NOT_FOUND", "Session does not exist.")
    if principal.get("sid") != session_id:
        raise ApiException(403, "FORBIDDEN", "This token cannot access that session.")
    fields = CollectedFields.model_validate(session.get("collected_fields") or {})
    recap = gateway.summarize_patient(fields, session.get("language") or "en")
    rules = run_rule_engine(fields)
    return {
        "session_id": session_id,
        "recap": recap,
        "fields": fields.model_dump(),
        "missing_fields": rules.missing_fields,
        "source": "AI_GENERATED",
    }


@router.post("/intake/{session_id}/confirm")
def confirm_intake(session_id: str, body: ConfirmBody, principal: dict = Depends(require_patient)) -> dict:
    store = get_store()
    session = store.get_session(session_id)
    if not session:
        raise ApiException(404, "SESSION_NOT_FOUND", "Session does not exist.")
    if principal.get("sid") != session_id:
        raise ApiException(403, "FORBIDDEN", "This token cannot access that session.")
    if not body.confirmed:
        return {"status": session.get("status"), "message": "Continue the conversation to correct answers."}

    existing = store.get_intake_by_session(session_id)
    if existing:
        return {"intake_id": existing["id"], "status": existing["status"], "session_status": session.get("status")}

    fields = CollectedFields.model_validate(session.get("collected_fields") or {})
    rules = run_rule_engine(fields)
    # Doctor clinical prose is always English
    ai_summary = gateway.summarize_clinical(fields)
    patient_lang = session.get("language") or "en"
    lang_code = patient_lang.split("-")[0].lower()
    consultation_summary = session.get("consultation_summary")
    consultation_summary_en = session.get("consultation_summary_en")
    if not consultation_summary:
        try:
            consultation_summary = gateway.generate_consultation_summary(fields, patient_lang)
        except Exception:  # noqa: BLE001
            consultation_summary = None
    if not consultation_summary_en:
        if lang_code == "en" and consultation_summary:
            consultation_summary_en = consultation_summary
        else:
            try:
                consultation_summary_en = gateway.generate_consultation_summary(fields, "en")
            except Exception:  # noqa: BLE001
                consultation_summary_en = consultation_summary if lang_code == "en" else None

    if consultation_summary:
        session["consultation_summary"] = consultation_summary
    if consultation_summary_en:
        session["consultation_summary_en"] = consultation_summary_en

    patient = store.get_patient(session["patient_id"]) or {}
    hashed = session.get("aadhaar_hash") or patient.get("aadhaar_hash")
    last4 = fields.aadhaar_last4 or patient.get("aadhaar_last4")

    # If Aadhaar was collected mid-chat, normalize and attach to patient
    raw_aadhaar = None
    structured_probe = session.get("collected_fields") or {}
    if structured_probe.get("_aadhaar_raw"):
        raw_aadhaar = normalize_aadhaar(str(structured_probe.get("_aadhaar_raw")))
    if raw_aadhaar:
        hashed = aadhaar_hash(raw_aadhaar)
        last4 = aadhaar_last4(raw_aadhaar)
        fields.aadhaar_last4 = last4

    if hashed:
        store.update_patient(
            session["patient_id"],
            display_name=fields.display_name,
            age=fields.age,
            gender=fields.gender if fields.gender != "unknown" else None,
            aadhaar_hash=hashed,
            aadhaar_last4=last4,
        )

    intake = store.create_intake(
        {
            "session_id": session_id,
            "patient_id": session["patient_id"],
            "aadhaar_hash": hashed,
            "aadhaar_last4": last4,
            "chief_complaint": fields.chief_complaint,
            "duration": fields.duration,
            "symptoms": [s.model_dump() for s in fields.symptoms],
            "medical_history": fields.medical_history,
            "medications": fields.medications,
            "allergies": fields.allergies,
            "missing_information": rules.missing_fields,
            "contradictions": (
                [c.model_dump() for c in rules.contradictions]
                + list(session.get("contradictions") or [])
            ),
            "priority_flag": rules.priority_flag.value,
            "ai_summary": ai_summary,
            "consultation_summary": consultation_summary,
            "consultation_summary_en": consultation_summary_en,
            "turn_history": list(session.get("turn_history") or []),
            "language": session.get("language") or "en",
            "status": IntakeStatus.AI_GENERATED.value,
            "structured_fields": fields.model_dump(),
        }
    )
    session["status"] = SessionStatus.SUBMITTED.value
    session["submitted_at"] = datetime.now(UTC).isoformat()
    store.save_session(session)
    started = session.get("started_at") or session.get("created_at")
    duration = None
    if started:
        try:
            start_dt = datetime.fromisoformat(started.replace("Z", "+00:00"))
            duration = (datetime.now(UTC) - start_dt).total_seconds()
        except ValueError:
            duration = None
    store.upsert_session_metrics(
        session_id,
        duration_seconds=duration,
        question_count=session.get("question_count") or 0,
        completeness_pct=_completeness(fields, rules.missing_fields),
    )
    return {
        "intake_id": intake["id"],
        "status": intake["status"],
        "session_status": session["status"],
        "priority_flag": intake["priority_flag"],
    }


@router.get("/intake/{intake_id}")
def get_intake(intake_id: str, principal: dict = Depends(require_staff)) -> dict:
    store = get_store()
    intake = store.get_intake(intake_id)
    if not intake:
        raise ApiException(404, "INTAKE_NOT_FOUND", "Intake does not exist.")
    return intake
