from __future__ import annotations

from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from auth.supabase_auth import require_patient
from core.config import settings
from core.errors import ApiException
from core.llm_gateway import gateway
from core.normalization import normalize_fields
from core.question_engine import detect_phase, question_text, select_next_question
from core.rule_engine import run_rule_engine
from core.schema import CollectedFields, InputType, TurnRecord
from core.speech_gateway import speech_gateway
from db.supabase_client import get_store

router = APIRouter()


class TurnBody(BaseModel):
    turn_id: str = Field(min_length=8)
    input_type: Literal["text", "audio"] = "text"
    content: str | None = None
    audio_base64: str | None = None
    language: str | None = None


def _assert_session_owner(session: dict, principal: dict) -> None:
    if principal.get("sid") != session["id"] and principal.get("sub") != session.get("patient_id"):
        raise ApiException(403, "FORBIDDEN", "This token cannot access that session.")


@router.get("/conversation/{session_id}/state")
def conversation_state(session_id: str, principal: dict = Depends(require_patient)) -> dict:
    store = get_store()
    session = store.get_session(session_id)
    if not session:
        raise ApiException(404, "SESSION_NOT_FOUND", "Session does not exist.")
    _assert_session_owner(session, principal)
    return {
        "session_id": session_id,
        "status": session.get("status"),
        "collected_fields": session.get("collected_fields"),
        "turn_history": session.get("turn_history"),
        "language": session.get("language"),
    }


@router.post("/conversation/{session_id}/turn")
def conversation_turn(session_id: str, body: TurnBody, principal: dict = Depends(require_patient)) -> dict:
    store = get_store()
    session = store.get_session(session_id)
    if not session:
        raise ApiException(404, "SESSION_NOT_FOUND", "Session does not exist.")
    _assert_session_owner(session, principal)

    history: list[dict[str, Any]] = list(session.get("turn_history") or [])
    for existing in history:
        if existing.get("turn_id") == body.turn_id and existing.get("speaker") == "patient":
            ai = next((t for t in history if t.get("in_reply_to") == body.turn_id), None)
            return {
                "idempotent": True,
                "ai_message": (ai or {}).get("text"),
                "audio_url": (ai or {}).get("audio_url"),
                "updated_fields": session.get("collected_fields"),
                "missing_fields": session.get("missing_fields") or [],
                "next_question": session.get("pending_questions")[:1] if session.get("pending_questions") else None,
                "phase": session.get("phase", "consultation"),
                "consultation_summary": session.get("consultation_summary"),
            }

    language = body.language or session.get("language") or "en"
    asr_confidence = None
    utterance = (body.content or "").strip()

    if body.input_type == InputType.AUDIO.value:
        if not body.audio_base64:
            raise ApiException(400, "AUDIO_REQUIRED", "audio_base64 is required for audio turns.")
        import base64

        audio_bytes = base64.b64decode(body.audio_base64)
        asr = speech_gateway.transcribe(audio_bytes, language)
        asr_confidence = asr.get("confidence")
        if asr.get("error") == "ASR_UNAVAILABLE":
            raise ApiException(
                503,
                "ASR_UNAVAILABLE",
                "Voice recognition is not configured. Type your answer instead.",
            )
        if asr.get("error") == "LANGUAGE_ASR_UNSUPPORTED":
            raise ApiException(
                409,
                "LANGUAGE_ASR_UNSUPPORTED",
                "Voice is experimental for this language. Please type this turn.",
            )
        if asr_confidence is not None and asr_confidence < settings.asr_confidence_threshold:
            raise ApiException(
                422,
                "LOW_ASR_CONFIDENCE",
                "I didn't catch that clearly — can you repeat, or type instead?",
                details={"confidence": asr_confidence, "transcript": asr.get("text")},
            )
        utterance = (asr.get("text") or "").strip()
        if not utterance:
            raise ApiException(
                422,
                "EMPTY_TRANSCRIPT",
                "I didn't catch that clearly — can you repeat, or type instead?",
            )

    if not utterance:
        raise ApiException(400, "EMPTY_CONTENT", "Type or speak an answer to continue.")

    fields = CollectedFields.model_validate(session.get("collected_fields") or {})
    try:
        delta_model = gateway.extract(utterance, fields, language)
    except Exception as exc:  # noqa: BLE001
        raise ApiException(
            502,
            "SCHEMA_VALIDATION_FAILED",
            "LLM output did not match intake schema; re-prompted.",
            details={"reason": str(exc)},
        ) from exc

    delta = delta_model.model_dump(exclude_none=True)
    prior_turns = [TurnRecord.model_validate(t) for t in history if t.get("speaker") == "patient"]
    merged = fields.merge_delta(delta)
    merged, review_terms = normalize_fields(merged)
    rules = run_rule_engine(merged, delta=delta, turn_history=prior_turns, current_turn_id=body.turn_id)

    patient_turn = TurnRecord(
        turn_id=body.turn_id,
        speaker="patient",
        text=utterance,
        input_type=InputType(body.input_type),
        extracted_delta=delta,
        asr_confidence=asr_confidence,
        model_version=gateway.model_version,
        validation_ok=True,
    )
    history.append(patient_turn.model_dump())

    question_count = int(session.get("question_count") or 0) + 1
    nxt = select_next_question(
        merged,
        rules.missing_fields,
        question_count,
        language=language,
        max_questions=settings.max_questions,
    )
    hint = question_text(nxt, language) if nxt else None
    ai_text = gateway.phrase_reply(
        utterance,
        merged,
        language,
        next_field=nxt.field if nxt else None,
        next_hint=hint,
    )
    done = nxt is None

    tts = speech_gateway.synthesize(ai_text, language)
    ai_id = str(uuid4())
    ai_turn = {
        "turn_id": ai_id,
        "in_reply_to": body.turn_id,
        "speaker": "ai",
        "text": ai_text,
        "audio_url": tts.get("audio_url"),
        "extracted_delta": {},
    }
    history.append(ai_turn)

    session["collected_fields"] = merged.model_dump()
    session["turn_history"] = history
    session["missing_fields"] = rules.missing_fields
    session["contradictions"] = [c.model_dump() for c in rules.contradictions]
    session["priority_flag"] = rules.priority_flag.value
    session["pending_questions"] = [nxt.model_dump()] if nxt else []
    session["question_count"] = question_count
    session["model_version"] = gateway.model_version
    session["dictionary_review"] = review_terms
    phase = detect_phase(merged).value
    
    summary = None
    if done:
        phase = "completed"
        if not session.get("consultation_summary"):
            summary = gateway.generate_consultation_summary(merged, language)
        else:
            summary = session.get("consultation_summary")
            
    session["phase"] = phase
    if summary:
        session["consultation_summary"] = summary
        
    store.save_session(session)

    return {
        "ai_message": ai_text,
        "audio_url": tts.get("audio_url"),
        "updated_fields": merged.model_dump(),
        "missing_fields": rules.missing_fields,
        "contradictions": [c.model_dump() for c in rules.contradictions],
        "priority_flag": rules.priority_flag.value,
        "next_question": nxt.model_dump() if nxt else None,
        "ready_for_confirm": done,
        "phase": phase,
        "consultation_summary": summary,
        "fact_chips": _chips(merged),
        "model_version": gateway.model_version,
        "llm_live": gateway.live,
    }


def _chips(fields: CollectedFields) -> list[dict[str, str]]:
    chips: list[dict[str, str]] = []
    if fields.chief_complaint:
        label = fields.chief_complaint.replace("SYM_", "").replace("_", " ").title()
        chips.append({"label": label, "field": "chief_complaint"})
    if fields.duration and fields.duration != "unknown":
        chips.append({"label": str(fields.duration), "field": "duration"})
    if fields.severity != "unknown":
        chips.append({"label": fields.severity, "field": "severity"})
    if fields.medications not in ("unknown", None) and fields.medications != []:
        chips.append({"label": str(fields.medications), "field": "medications"})
    return chips
