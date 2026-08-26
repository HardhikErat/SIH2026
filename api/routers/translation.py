from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from core.speech_gateway import speech_gateway

router = APIRouter()


class TranslateBody(BaseModel):
    text: str
    source_language: str
    target_language: str


@router.post("/translate")
def translate(body: TranslateBody) -> dict:
    if not body.text.strip():
        return {"translated_text": body.text}

    result = speech_gateway.translate(body.text, body.source_language, body.target_language)
    if result.get("error"):
        # For non-critical translation, fallback to original text is usually better than a hard crash,
        # but returning the error lets the client decide. We'll return the original text on error.
        return {"translated_text": body.text, "error": result["error"]}
    return {"translated_text": result.get("text", body.text)}
