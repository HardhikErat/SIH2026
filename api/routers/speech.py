from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from core.errors import ApiException
from core.speech_gateway import speech_gateway

router = APIRouter()


class TranscribeBody(BaseModel):
    audio_base64: str
    language: str = "en"


class SynthesizeBody(BaseModel):
    text: str
    language: str = "en"


@router.post("/speech/transcribe")
def transcribe(body: TranscribeBody) -> dict:
    import base64

    try:
        audio = base64.b64decode(body.audio_base64)
    except Exception as exc:  # noqa: BLE001
        raise ApiException(400, "INVALID_AUDIO", "audio_base64 is not valid.") from exc
    result = speech_gateway.transcribe(audio, body.language)
    if result.get("error"):
        raise ApiException(503, result["error"], "Speech recognition is unavailable for this request.")
    return {"text": result.get("text"), "confidence": result.get("confidence"), "provider": result.get("provider")}


@router.post("/speech/synthesize")
def synthesize(body: SynthesizeBody) -> dict:
    result = speech_gateway.synthesize(body.text, body.language)
    return {
        "audio_url": result.get("audio_url"),
        "audio_base64": result.get("audio_base64"),
        "provider": result.get("provider"),
    }
