from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from auth.supabase_auth import require_staff
from core.aadhaar import mask_aadhaar
from core.config import settings
from core.errors import ApiException
from core.history_insights import analyze_patient_history, serialize_history_entry
from core.schema import CollectedFields, IntakeStatus
from db.supabase_client import get_store

router = APIRouter()

# 06_API §5 / 12_Safety §1.2 — structurally the only writer of DOCTOR_VERIFIED.
VERIFY_ENDPOINT_MARK = "POST /doctor/intake/{id}/verify"


class LoginBody(BaseModel):
    email: str
    password: str


class IntakePatch(BaseModel):
    fields: dict[str, Any]


class VerifyBody(BaseModel):
    acknowledge_high_priority: bool = False


@router.post("/doctor/login")
def doctor_login(body: LoginBody) -> dict:
    store = get_store()
    user = store.authenticate_staff(body.email, body.password)
    if not user:
        raise ApiException(401, "AUTH_FAILED", "Email or password is not recognised.")
    # Mint a staff JWT using the same signer as patient tokens (demo / CI).
    # Production should use Supabase Auth OTP and verify the JWT in middleware.
    from jose import jwt

    now = datetime.now(UTC)
    token = jwt.encode(
        {
            "sub": user["id"],
            "email": user["email"],
            "role": user["role"],
            "app_metadata": {"role": user["role"]},
            "camp_id": user.get("camp_id"),
            "iat": int(now.timestamp()),
            "exp": int(now.timestamp()) + 8 * 3600,
        },
        settings.session_secret,
        algorithm="HS256",
    )
    return {"token": token, "role": user["role"], "user_id": user["id"], "camp_id": user.get("camp_id")}


@router.get("/doctor/queue")
def doctor_queue(principal: dict = Depends(require_staff)) -> dict:
    store = get_store()
    camp_id = principal.get("camp_id")
    items = store.list_queue(camp_id)
    queue = []
    now = datetime.now(UTC)
    for item in items:
        patient = item.get("patient") or {}
        created = item.get("created_at")
        wait = None
        if created:
            try:
                wait = int((now - datetime.fromisoformat(created.replace("Z", "+00:00"))).total_seconds())
            except ValueError:
                wait = None
        queue.append(
            {
                "intake_id": item["id"],
                "patient_id": item.get("patient_id"),
                "display_name": patient.get("display_name") or "Patient",
                "aadhaar_masked": mask_aadhaar(patient.get("aadhaar_last4") or item.get("aadhaar_last4")),
                "priority_flag": item.get("priority_flag"),
                "chief_complaint": item.get("chief_complaint"),
                "wait_seconds": wait,
                "status": item.get("status"),
                "source": "AI_GENERATED",
            }
        )
    next_patient = queue[0] if queue else None
    return {"queue": queue, "next_patient": next_patient}


@router.get("/doctor/intake/{intake_id}")
def doctor_intake(intake_id: str, principal: dict = Depends(require_staff)) -> dict:
    store = get_store()
    intake = store.get_intake(intake_id)
    if not intake:
        raise ApiException(404, "INTAKE_NOT_FOUND", "Intake does not exist.")
    audit = store.list_audit(intake_id)
    patient = store.get_patient(intake.get("patient_id") or "") or {}
    hashed = intake.get("aadhaar_hash") or patient.get("aadhaar_hash")
    history_rows: list = []
    if hashed:
        history_rows = store.list_intakes_by_aadhaar_hash(hashed, exclude_intake_id=intake_id)
    elif intake.get("patient_id"):
        history_rows = store.list_intakes_by_patient(intake["patient_id"], exclude_intake_id=intake_id)

    current_fields = CollectedFields.model_validate(intake.get("structured_fields") or {})
    if not current_fields.aadhaar_last4:
        current_fields.aadhaar_last4 = intake.get("aadhaar_last4") or patient.get("aadhaar_last4")
    analysis = analyze_patient_history(current_fields, history_rows)

    return {
        **intake,
        "audit_log": audit,
        "source_tag": "AI_GENERATED" if intake.get("status") == IntakeStatus.AI_GENERATED.value else "DOCTOR_VERIFIED",
        "patient": {
            "id": patient.get("id"),
            "display_name": patient.get("display_name"),
            "age": patient.get("age"),
            "gender": patient.get("gender"),
            "aadhaar_masked": mask_aadhaar(patient.get("aadhaar_last4") or intake.get("aadhaar_last4")),
        },
        "medical_history_timeline": [serialize_history_entry(r) for r in history_rows],
        "historical_insights": analysis.get("insights") or [],
        "historical_insights_overview": analysis.get("overview"),
        "prior_visit_count": analysis.get("prior_visit_count") or 0,
    }


@router.patch("/doctor/intake/{intake_id}")
def patch_intake(intake_id: str, body: IntakePatch, principal: dict = Depends(require_staff)) -> dict:
    store = get_store()
    intake = store.get_intake(intake_id)
    if not intake:
        raise ApiException(404, "INTAKE_NOT_FOUND", "Intake does not exist.")
    if intake.get("status") == IntakeStatus.DOCTOR_VERIFIED.value:
        raise ApiException(409, "ALREADY_VERIFIED", "Verified intakes are not edited on this path.")
    # Refuse status transitions here — verify is the only gate.
    if "status" in body.fields:
        raise ApiException(
            403,
            "VERIFY_GATE",
            f"Only {VERIFY_ENDPOINT_MARK} may change intake status to DOCTOR_VERIFIED.",
        )
    structured = dict(intake.get("structured_fields") or {})
    changed_by = principal.get("sub") or "doctor"
    for field, new_value in body.fields.items():
        old = structured.get(field, intake.get(field))
        if old == new_value:
            continue
        store.append_audit(intake_id, field, old, new_value, changed_by)
        structured[field] = new_value
        if field in intake:
            intake[field] = new_value
    intake["structured_fields"] = structured
    store.save_intake(intake)
    return {"intake_id": intake_id, "fields": structured, "status": intake["status"]}


@router.post("/doctor/intake/{intake_id}/verify")
def verify_intake(intake_id: str, body: VerifyBody, principal: dict = Depends(require_staff)) -> dict:
    store = get_store()
    intake = store.get_intake(intake_id)
    if not intake:
        raise ApiException(404, "INTAKE_NOT_FOUND", "Intake does not exist.")
    if intake.get("status") == IntakeStatus.DOCTOR_VERIFIED.value:
        return {"intake_id": intake_id, "status": intake["status"], "already": True}
    if intake.get("priority_flag") == "HIGH" and not body.acknowledge_high_priority:
        raise ApiException(
            409,
            "HIGH_PRIORITY_UNACKNOWLEDGED",
            "HIGH priority flag must be acknowledged before Verify & Save.",
        )
    old = intake.get("status")
    intake["status"] = IntakeStatus.DOCTOR_VERIFIED.value
    intake["doctor_id"] = principal.get("sub")
    intake["verified_at"] = datetime.now(UTC).isoformat()
    store.append_audit(intake_id, "status", old, intake["status"], principal.get("sub") or "doctor")
    store.save_intake(intake)
    return {"intake_id": intake_id, "status": intake["status"], "verified_at": intake["verified_at"]}
