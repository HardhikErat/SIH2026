"""IndicWhisper primary / Bhashini fallback — 04_Backend §2.3, 14_AI_NLP §7."""

from __future__ import annotations

import base64
import logging
from typing import Protocol

import httpx

from core.config import settings
from core.languages import get_language

logger = logging.getLogger(__name__)


class Transcription(dict):
    pass


class SpeechProvider(Protocol):
    def transcribe(self, audio_bytes: bytes, language: str) -> dict: ...

    def synthesize(self, text: str, language: str) -> dict: ...


class IndicWhisperProvider:
    name = "indic_whisper"

    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    def transcribe(self, audio_bytes: bytes, language: str) -> dict:
        with httpx.Client(timeout=60) as client:
            r = client.post(
                f"{self.base_url}/transcribe",
                files={"file": ("audio.wav", audio_bytes, "audio/wav")},
                data={"language": language},
            )
            r.raise_for_status()
            data = r.json()
            return {
                "text": data.get("text", ""),
                "confidence": float(data.get("confidence", 0.0)),
                "provider": self.name,
            }

    def synthesize(self, text: str, language: str) -> dict:
        with httpx.Client(timeout=60) as client:
            r = client.post(
                f"{self.base_url}/synthesize",
                json={"text": text, "language": language},
            )
            r.raise_for_status()
            data = r.json()
            return {"audio_url": data.get("audio_url"), "provider": self.name}


class BhashiniProvider:
    name = "bhashini"

    def __init__(self, api_key: str, user_id: str) -> None:
        self.api_key = api_key
        self.user_id = user_id

    def transcribe(self, audio_bytes: bytes, language: str) -> dict:
        payload = {
            "config": {"language": {"sourceLanguage": language}},
            "audio": [{"audioContent": base64.b64encode(audio_bytes).decode("ascii")}],
        }
        with httpx.Client(timeout=60) as client:
            r = client.post(
                "https://dhruva-api.bhashini.gov.in/services/inference/asr",
                headers={
                    "Authorization": self.api_key,
                    "userID": self.user_id,
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            r.raise_for_status()
            data = r.json()
            text = ""
            try:
                text = data["output"][0]["source"]
            except (KeyError, IndexError, TypeError):
                text = str(data)
            return {"text": text, "confidence": 0.7, "provider": self.name}

    def synthesize(self, text: str, language: str) -> dict:
        payload = {
            "config": {"language": {"sourceLanguage": language}},
            "input": [{"source": text}],
        }
        with httpx.Client(timeout=60) as client:
            r = client.post(
                "https://dhruva-api.bhashini.gov.in/services/inference/tts",
                headers={
                    "Authorization": self.api_key,
                    "userID": self.user_id,
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            r.raise_for_status()
            data = r.json()
            audio_b64 = ""
            try:
                audio_b64 = data["audio"][0]["audioContent"]
            except (KeyError, IndexError, TypeError):
                audio_b64 = ""
            return {"audio_base64": audio_b64, "audio_url": None, "provider": self.name}


class GroqWhisperProvider:
    name = "groq_whisper"

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    def transcribe(self, audio_bytes: bytes, language: str) -> dict:
        with httpx.Client(timeout=60) as client:
            r = client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                files={"file": ("audio.wav", audio_bytes, "audio/wav")},
                data={"model": "whisper-large-v3-turbo", "language": language.split("-")[0]},
            )
            r.raise_for_status()
            data = r.json()
            text = (data.get("text") or "").strip()
            return {
                "text": text,
                "confidence": 0.85 if text else 0.0,
                "provider": self.name,
            }

    def synthesize(self, text: str, language: str) -> dict:
        return {
            "audio_url": None,
            "audio_base64": None,
            "provider": self.name,
            "note": "TTS handled by client",
        }


class StubSpeechProvider:
    name = "stub"

    def transcribe(self, audio_bytes: bytes, language: str) -> dict:
        # Without a live ASR endpoint we refuse to guess clinical content from bytes.
        return {
            "text": "",
            "confidence": 0.0,
            "provider": self.name,
            "error": "ASR_UNAVAILABLE",
        }

    def synthesize(self, text: str, language: str) -> dict:
        return {
            "audio_url": None,
            "audio_base64": None,
            "provider": self.name,
            "note": "TTS unavailable; on-screen text is the source of truth",
        }


class SpeechGateway:
    def __init__(self) -> None:
        self.providers: list[SpeechProvider] = []
        if settings.indic_whisper_url:
            self.providers.append(IndicWhisperProvider(settings.indic_whisper_url))
        if settings.bhashini_api_key:
            self.providers.append(BhashiniProvider(settings.bhashini_api_key, settings.bhashini_user_id))
        if settings.groq_api_key:
            self.providers.append(GroqWhisperProvider(settings.groq_api_key))
        self.stub = StubSpeechProvider()

    def transcribe(self, audio_bytes: bytes, language: str) -> dict:
        lang = get_language(language)
        if lang and not lang.asr_supported:
            return {
                "text": "",
                "confidence": 0.0,
                "provider": "none",
                "error": "LANGUAGE_ASR_UNSUPPORTED",
            }
        for provider in self.providers:
            try:
                return provider.transcribe(audio_bytes, language)
            except Exception as exc:  # noqa: BLE001
                logger.warning("ASR %s failed: %s", getattr(provider, "name", provider), exc)
        return self.stub.transcribe(audio_bytes, language)

    def synthesize(self, text: str, language: str) -> dict:
        lang = get_language(language)
        if lang and not lang.tts_supported:
            return self.stub.synthesize(text, language)
        for provider in self.providers:
            try:
                return provider.synthesize(text, language)
            except Exception as exc:  # noqa: BLE001
                logger.warning("TTS %s failed: %s", getattr(provider, "name", provider), exc)
        return self.stub.synthesize(text, language)


speech_gateway = SpeechGateway()
