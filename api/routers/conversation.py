from __future__ import annotations

import re
from typing import Any, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from auth.supabase_auth import require_patient
from core.config import settings
from core.conversation_memory import (
    build_memory,
    infer_implied_fields,
    question_tracker_id,
    recent_patient_utterances,
)
from core.errors import ApiException
from core.llm_gateway import gateway
from core.normalization import normalize_fields
from core.question_engine import detect_phase, question_text, select_next_question
from core.rule_engine import run_rule_engine
from core.schema import CollectedFields, InputType, TurnRecord
from core.speech_gateway import speech_gateway
from core.utterance_enrichment import close_medication_name_if_declined, enrich_utterance_delta
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
        "conversation_memory": session.get("conversation_memory"),
        "phase": session.get("phase", "consultation"),
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
                "conversation_memory": session.get("conversation_memory"),
                "conversation_complete": (session.get("phase") == "completed"),
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
    asked_questions: list[str] = list(session.get("asked_questions") or [])
    recent_turns = recent_patient_utterances(history)
    try:
        delta_model = gateway.extract(utterance, fields, language, recent_turns=recent_turns)
    except Exception as exc:  # noqa: BLE001
        raise ApiException(
            502,
            "SCHEMA_VALIDATION_FAILED",
            "LLM output did not match intake schema; re-prompted.",
            details={"reason": str(exc)},
        ) from exc

    delta = delta_model.model_dump(exclude_none=True)
    pending = session.get("pending_questions") or []
    pending_field = None
    if pending and isinstance(pending[0], dict):
        pending_field = pending[0].get("field")
    delta = enrich_utterance_delta(
        utterance,
        delta,
        pending_field=pending_field,
        collected=fields,
    )
    # Capture Aadhaar from utterance / delta without storing the full number in fields
    from core.aadhaar import aadhaar_hash, aadhaar_last4, normalize_aadhaar

    raw_aadhaar = normalize_aadhaar(str(delta.pop("aadhaar_number", "") or ""))
    if not raw_aadhaar:
        raw_aadhaar = normalize_aadhaar(utterance)
    if raw_aadhaar and (pending_field == "aadhaar_last4" or not fields.aadhaar_last4):
        delta["aadhaar_last4"] = aadhaar_last4(raw_aadhaar)
        session["aadhaar_hash"] = aadhaar_hash(raw_aadhaar)
        store.update_patient(
            session["patient_id"],
            aadhaar_hash=session["aadhaar_hash"],
            aadhaar_last4=delta["aadhaar_last4"],
        )
    delta.pop("aadhaar_number", None)

    # Normalize severity casing from LLM ("Mild" → "mild")
    if isinstance(delta.get("severity"), str):
        sev = delta["severity"].strip().casefold()
        if sev in ("mild", "moderate", "severe", "unknown"):
            delta["severity"] = sev
        else:
            delta.pop("severity", None)

    prior_turns = [TurnRecord.model_validate(t) for t in history if t.get("speaker") == "patient"]
    merged = fields.merge_delta(delta)
    merged, review_terms = normalize_fields(merged)
    merged = infer_implied_fields(merged)
    # If we already asked for the medicine name once and still have none, stop looping
    merged = close_medication_name_if_declined(
        utterance,
        merged,
        pending_field=pending_field,
        asked_questions=asked_questions,
    )
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
        asked_questions=asked_questions,
    )
    # Defense: never re-ask a field we just collected this turn
    if nxt is not None and merged.is_collected(nxt.field):
        nxt = select_next_question(
            merged,
            [f for f in rules.missing_fields if f != nxt.field],
            question_count,
            language=language,
            max_questions=settings.max_questions,
            asked_questions=asked_questions + [question_tracker_id(nxt)],
        )
    if nxt is not None:
        tracker = question_tracker_id(nxt)
        if tracker not in asked_questions:
            asked_questions.append(tracker)
    hint = question_text(nxt, language) if nxt else None
    ai_text = gateway.phrase_reply(
        utterance,
        merged,
        language,
        next_field=nxt.field if nxt else None,
        next_hint=hint,
    )
    # Strip accidental re-ask of already-collected severity/duration from live LLM replies
    ai_text = _sanitize_reply(ai_text, merged, nxt.field if nxt else None)
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

    memory = build_memory(
        merged,
        rules.missing_fields,
        asked_questions,
        conversation_complete=done,
    )

    session["collected_fields"] = merged.model_dump()
    session["turn_history"] = history
    session["missing_fields"] = rules.missing_fields
    session["contradictions"] = [c.model_dump() for c in rules.contradictions]
    session["priority_flag"] = rules.priority_flag.value
    session["pending_questions"] = [nxt.model_dump()] if nxt else []
    session["question_count"] = question_count
    session["asked_questions"] = asked_questions
    session["conversation_memory"] = memory.model_dump()
    session["model_version"] = gateway.model_version
    session["dictionary_review"] = review_terms
    phase = detect_phase(merged).value

    summary = None
    summary_updated = False
    if done:
        phase = "completed"
        had_new_facts = bool(delta)
        prior_summary = session.get("consultation_summary")
        # Regenerate when first completing OR patient added/changed facts after "Continue talking"
        if not prior_summary or had_new_facts:
            summary = gateway.generate_consultation_summary(merged, language)
            summary_updated = True
        else:
            summary = prior_summary
            summary_updated = False

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
        "conversation_complete": done,
        "summary_updated": summary_updated,
        "conversation_memory": memory.model_dump(),
        "phase": phase,
        "consultation_summary": summary,
        "fact_chips": _chips(merged),
        "model_version": gateway.model_version,
        "llm_live": gateway.live,
    }


def _sanitize_reply(ai_text: str, fields: CollectedFields, next_field: str | None) -> str:
    """If the model re-asks a field already collected, drop that duplicated ask."""
    text = (ai_text or "").strip()
    if not text:
        return text
    # Never show leak-filter placeholders to patients
    text = text.replace("[removed]", "")
    text = re.sub(r"\s{2,}", " ", text).strip()
    lower = text.casefold()
    # Severity already known — remove the classic severity questionnaire sentence
    if fields.is_collected("severity") and next_field != "severity":
        patterns = [
            r"\s*is the pain or discomfort mild, moderate, or severe\??",
            r"\s*mild, moderate, or severe\??",
            r"\s*तकलीफ हल्की है, मध्यम है, या तेज है\??",
        ]
        for pat in patterns:
            text = re.sub(pat, "", text, flags=re.I).strip()
        text = re.sub(r"\s{2,}", " ", text).strip(" .")
        if text and not text.endswith((".", "?", "!", "।")):
            text += "."
    # Duration already known
    if fields.is_collected("duration") and next_field != "duration":
        if "how many days" in lower:
            text = re.sub(
                r"\s*how many days has this been going on\??",
                "",
                text,
                flags=re.I,
            ).strip()
    return text or ai_text


def _format_meds_chip(medications: object) -> str | None:
    if medications in (None, "unknown"):
        return None
    if medications == "none":
        return "No medicines"
    if medications == "unspecified":
        return "Medicines (name not given)"
    if isinstance(medications, list):
        names = [str(m).strip() for m in medications if str(m).strip()]
        if not names:
            return None
        return ", ".join(n.title() if n.islower() else n for n in names)
    return str(medications)


def _chips(fields: CollectedFields) -> list[dict[str, str]]:
    chips: list[dict[str, str]] = []
    if fields.chief_complaint:
        label = fields.chief_complaint.replace("SYM_", "").replace("_", " ").title()
        chips.append({"label": label, "field": "chief_complaint"})
    if fields.duration and fields.duration != "unknown":
        chips.append({"label": str(fields.duration), "field": "duration"})
    if fields.severity != "unknown":
        chips.append({"label": fields.severity.title(), "field": "severity"})
    if fields.headache == "true":
        chips.append({"label": "Headache", "field": "headache"})
    if fields.fever == "true" and (not fields.chief_complaint or fields.chief_complaint != "SYM_FEVER"):
        chips.append({"label": "Fever", "field": "fever"})
    med_label = _format_meds_chip(fields.medications)
    if med_label:
        chips.append({"label": med_label, "field": "medications"})
    return chips
