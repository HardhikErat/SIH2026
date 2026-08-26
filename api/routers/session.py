from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter
from pydantic import BaseModel

from auth.supabase_auth import create_patient_token
from core.aadhaar import aadhaar_hash, aadhaar_last4, mask_aadhaar, validate_aadhaar
from core.errors import ApiException
from core.languages import LANGUAGES, get_language
from core.llm_gateway import gateway
from core.schema import CollectedFields
from core.speech_gateway import speech_gateway
from db.supabase_client import get_store

router = APIRouter()


class StartSessionBody(BaseModel):
    language: str = "en"
    dialect_hint: str | None = None
    camp_id: str | None = None
    display_name: str | None = None
    age: int | None = None
    gender: str | None = None
    aadhaar_number: str
    audio_consent: bool = False


class LanguagePatch(BaseModel):
    language: str
    dialect_hint: str | None = None


@router.get("/health")
def health() -> dict:
    asr_live = any(getattr(p, "name", "") != "stub" for p in speech_gateway.providers)
    return {
        "status": "ok",
        "service": "intake-api",
        "llm": gateway.model_version,
        "llm_live": gateway.live,
        "asr_live": asr_live,
    }


@router.get("/languages")
def list_languages() -> dict:
    return {"languages": [lang.model_dump() for lang in LANGUAGES]}


@router.post("/session/start")
def start_session(body: StartSessionBody) -> dict:
    store = get_store()
    lang = get_language(body.language)
    if not lang:
        raise ApiException(400, "UNSUPPORTED_LANGUAGE", "Language code is not in the scheduled set.")

    try:
        aadhaar = validate_aadhaar(body.aadhaar_number)
    except ValueError as exc:
        raise ApiException(400, "INVALID_AADHAAR", str(exc)) from exc

    hashed = aadhaar_hash(aadhaar)
    last4 = aadhaar_last4(aadhaar)
    existing = store.find_patient_by_aadhaar_hash(hashed)
    returning = existing is not None

    if existing:
        patient = store.update_patient(
            existing["id"],
            display_name=body.display_name or existing.get("display_name"),
            age=body.age if body.age is not None else existing.get("age"),
            gender=body.gender or existing.get("gender"),
            preferred_language=body.language,
            dialect_hint=body.dialect_hint,
            camp_id=body.camp_id or existing.get("camp_id"),
            aadhaar_hash=hashed,
            aadhaar_last4=last4,
        )
        prior_count = len(store.list_intakes_by_aadhaar_hash(hashed))
    else:
        patient = store.create_patient(
            display_name=body.display_name,
            age=body.age,
            gender=body.gender,
            preferred_language=body.language,
            dialect_hint=body.dialect_hint,
            camp_id=body.camp_id,
            aadhaar_hash=hashed,
            aadhaar_last4=last4,
        )
        prior_count = 0

    session = store.create_session(patient["id"], camp_id=body.camp_id)
    fields = CollectedFields(
        display_name=body.display_name or patient.get("display_name"),
        age=body.age if body.age is not None else patient.get("age"),
        gender=body.gender or patient.get("gender") or "unknown",
        aadhaar_last4=last4,
        preferred_language=body.language,
        dialect_hint=body.dialect_hint,
    )
    session["collected_fields"] = fields.model_dump()
    session["language"] = body.language
    session["dialect_hint"] = body.dialect_hint
    session["audio_consent"] = body.audio_consent
    session["aadhaar_hash"] = hashed
    session["started_at"] = datetime.now(UTC).isoformat()
    store.save_session(session)
    token = create_patient_token(session["id"], patient["id"])

    name = fields.display_name or "there"
    if returning and prior_count:
        greeting = {
            "en": (
                f"Welcome back, {name}. I found {prior_count} earlier visit(s) linked to "
                f"Aadhaar {mask_aadhaar(last4)}. Tell me what is bothering you today — "
                "I do not diagnose or give medicine."
            ),
            "hi": (
                f"वापसी पर स्वागत है, {name}. आधार {mask_aadhaar(last4)} से जुड़ी "
                f"{prior_count} पुरानी विज़िट मिली। आज क्या तकलीफ है? मैं बीमारी नहीं बताऊँगा।"
            ),
            "mr": (
                f"परत स्वागत आहे, {name}. आधार {mask_aadhaar(last4)} शी संबंधित "
                f"{prior_count} जुन्या भेटी सापडल्या. आज काय त्रास आहे? मी निदान करणार नाही."
            ),
        }
    else:
        greeting = {
            "en": (
                f"Hello {name}. Your Aadhaar {mask_aadhaar(last4)} is registered as your "
                "patient ID. I will listen and write down your problem for the doctor. "
                "I do not diagnose or give medicine."
            ),
            "hi": (
                f"नमस्ते {name}. आपका आधार {mask_aadhaar(last4)} रोगी पहचान के रूप में दर्ज है। "
                "मैं डॉक्टर के लिए लिखूँगा — बीमारी या दवाई नहीं बताऊँगा।"
            ),
            "mr": (
                f"नमस्कार {name}. तुमचा आधार {mask_aadhaar(last4)} रुग्ण ओळख म्हणून नोंदला आहे. "
                "मी डॉक्टरसाठी लिहीन — निदान किंवा औषध सांगणार नाही."
            ),
        }
    ai_message = greeting.get(body.language.split("-")[0], greeting["en"])
    return {
        "session_id": session["id"],
        "patient_id": patient["id"],
        "token": token,
        "language": lang.model_dump(),
        "ai_message": ai_message,
        "audio_consent": body.audio_consent,
        "returning_patient": returning,
        "prior_visit_count": prior_count,
        "aadhaar_masked": mask_aadhaar(last4),
    }


@router.patch("/session/{session_id}/language")
def patch_language(session_id: str, body: LanguagePatch) -> dict:
    store = get_store()
    session = store.get_session(session_id)
    if not session:
        raise ApiException(404, "SESSION_NOT_FOUND", "Session does not exist.")
    lang = get_language(body.language)
    if not lang:
        raise ApiException(400, "UNSUPPORTED_LANGUAGE", "Language code is not in the scheduled set.")
    session["language"] = body.language
    session["dialect_hint"] = body.dialect_hint
    fields = CollectedFields.model_validate(session.get("collected_fields") or {})
    fields.preferred_language = body.language
    fields.dialect_hint = body.dialect_hint
    session["collected_fields"] = fields.model_dump()
    store.save_session(session)
    store.update_patient(session["patient_id"], preferred_language=body.language, dialect_hint=body.dialect_hint)
    return {"session_id": session_id, "language": lang.model_dump()}
