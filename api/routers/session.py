from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter
from pydantic import BaseModel

from auth.supabase_auth import create_patient_token
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
        from core.errors import ApiException

        raise ApiException(400, "UNSUPPORTED_LANGUAGE", "Language code is not in the scheduled set.")
    patient = store.create_patient(
        display_name=body.display_name,
        preferred_language=body.language,
        dialect_hint=body.dialect_hint,
        camp_id=body.camp_id,
        # supabase client might not have age/gender, but we can store it in metadata if needed. Assuming it accepts them or ignores them. We'll at least put it in fields.
    )
    session = store.create_session(patient["id"], camp_id=body.camp_id)
    fields = CollectedFields(
        display_name=body.display_name,
        age=body.age,
        gender=body.gender or "unknown",
        preferred_language=body.language,
        dialect_hint=body.dialect_hint,
    )
    session["collected_fields"] = fields.model_dump()
    session["language"] = body.language
    session["dialect_hint"] = body.dialect_hint
    session["audio_consent"] = body.audio_consent
    session["started_at"] = datetime.now(UTC).isoformat()
    store.save_session(session)
    token = create_patient_token(session["id"], patient["id"])
    greeting = {
        "en": "I will listen and write down your problem for the doctor. I do not diagnose or give medicine.",
        "hi": "मैं आपकी बात सुनकर डॉक्टर के लिए लिखूँगा। मैं बीमारी नहीं बताऊँगा और दवाई नहीं दूँगा।",
        "mr": "मी तुमची तक्रार डॉक्टरसाठी लिहीन. मी निदान करणार नाही किंवा औषध सांगणार नाही.",
    }
    ai_message = greeting.get(body.language.split("-")[0], greeting["en"])
    return {
        "session_id": session["id"],
        "patient_id": patient["id"],
        "token": token,
        "language": lang.model_dump(),
        "ai_message": ai_message,
        "audio_consent": body.audio_consent,
    }


@router.patch("/session/{session_id}/language")
def patch_language(session_id: str, body: LanguagePatch) -> dict:
    store = get_store()
    session = store.get_session(session_id)
    if not session:
        from core.errors import ApiException

        raise ApiException(404, "SESSION_NOT_FOUND", "Session does not exist.")
    lang = get_language(body.language)
    if not lang:
        from core.errors import ApiException

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
