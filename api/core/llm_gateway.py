"""Provider-agnostic LLM client with JSON-schema enforcement — 14_AI_NLP §2–4.

The LLM never assigns priority flags or clinical judgments.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Protocol

import httpx

from core.config import settings
from core.normalization import canonical_concept_prompt_block
from core.schema import CollectedFields, ExtractionDelta

logger = logging.getLogger(__name__)

EXTRACTION_SCHEMA = ExtractionDelta.model_json_schema()

SYSTEM_PROMPT = """You are a clinical intake documentation assistant. You extract
structured information from what a patient says. You do NOT diagnose, do NOT suggest
treatment, do NOT express clinical opinions. You never assign priority, urgency, or
triage flags.

Output contract: emit ONLY valid JSON matching the extraction schema. No prose.

If information is not stated, do not guess. Omit the field or mark it `unknown`.
Never infer a negative (e.g. 'no allergies') unless the patient explicitly said so.
Clinical yes/no fields must be the strings "true", "false", or "unknown" — never booleans.

Map symptoms to canonical concept IDs when possible (SYM_FEVER, SYM_COUGH, SYM_HEADACHE,
SYM_CHEST_PAIN, SYM_BREATHING, SYM_VOMITING). complaint_category is one of:
fever, chest_pain, headache, cough, default.

Return only the delta — fields newly stated or updated this turn.

{concepts}

Few-shot examples:
1) Patient: "I have had bukhar for 3 days"
   {{"chief_complaint":"SYM_FEVER","complaint_category":"fever","fever":"true","duration":"3 days","duration_days":3}}
2) Patient: "sine mein dard, saans lene mein takleef"
   {{"chief_complaint":"SYM_CHEST_PAIN","complaint_category":"chest_pain","chest_pain":"true","breathing_difficulty":"true"}}
3) Patient: "fever and cough, mild headache"
   {{"chief_complaint":"SYM_FEVER","complaint_category":"fever","fever":"true","symptoms":[{{"concept_id":"SYM_COUGH","severity":"unknown"}},{{"concept_id":"SYM_HEADACHE","severity":"mild"}}]}}
4) Earlier medications none; now "I took my BP tablet"
   {{"medications":["BP tablet"],"takes_medication":"true"}}
5) Patient: "I don't know about allergies"
   {{"allergies":"unknown","has_allergy":"unknown"}}
6) Patient: "no medicines"
   {{"medications":"none","takes_medication":"false"}}
"""

SUMMARY_PROMPT = """Given this structured intake JSON, write a 3-5 sentence factual
clinical summary for a doctor. State facts only. No interpretation, no suggested
diagnosis, no treatment advice. If a field is unknown, say it was not provided.
"""

CONFIRM_PROMPT = """Rewrite this structured intake as a short plain-language recap
for the patient in language code {language}. Short sentences, no medical jargon.
Do not add facts that are not in the JSON. Missing fields should be omitted, not guessed.
"""

DIAGNOSIS_LEAK = re.compile(
    r"\b(diagnos(?:is|e|ed)|prescribe|prescription|you (?:have|should take)|treatment plan)\b",
    re.I,
)


class LLMProvider(Protocol):
    name: str
    model_id: str

    def complete(self, system: str, user: str) -> str: ...


class GroqProvider:
    name = "groq"

    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model_id = model

    def complete(self, system: str, user: str) -> str:
        with httpx.Client(timeout=30) as client:
            r = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={
                    "model": self.model_id,
                    "temperature": 0,
                    "response_format": {"type": "json_object"},
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                },
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]


class OpenRouterProvider:
    name = "openrouter"

    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model_id = model

    def complete(self, system: str, user: str) -> str:
        with httpx.Client(timeout=45) as client:
            r = client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "HTTP-Referer": "https://sih2026.local",
                },
                json={
                    "model": self.model_id,
                    "temperature": 0,
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user", "content": user},
                    ],
                },
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]


class KeywordStubProvider:
    """Offline/demo extractor so camps and CI run without a paid LLM key."""

    name = "stub"
    model_id = "keyword-stub-v1"

    def complete(self, system: str, user: str) -> str:
        if "plain-language recap" in system.lower() or "patient in language" in system.lower():
            return _stub_confirm(user)
        if "clinical summary" in system.lower() or "3-5 sentence" in system.lower():
            return _stub_summary(user)
        utterance = user
        try:
            payload = json.loads(user)
            if isinstance(payload, dict) and payload.get("patient_utterance"):
                utterance = str(payload["patient_utterance"])
        except json.JSONDecodeError:
            pass
        text = utterance.casefold()
        delta: dict[str, Any] = {}
        if any(w in text for w in ("bukhar", "fever", "ताप", "बुखार", "tap ")):
            delta.update(
                {
                    "chief_complaint": "SYM_FEVER",
                    "complaint_category": "fever",
                    "fever": "true",
                }
            )
        if any(w in text for w in ("chest pain", "sine mein", "सीने में", "छाती")):
            delta.update(
                {
                    "chief_complaint": "SYM_CHEST_PAIN",
                    "complaint_category": "chest_pain",
                    "chest_pain": "true",
                }
            )
        if any(w in text for w in ("breath", "saans", "सांस", "श्वास", "cannot breathe", "can't breathe")):
            delta["breathing_difficulty"] = "true"
        if any(w in text for w in ("headache", "sir dard", "सिर दर्द", "डोकेदुखी")):
            delta.setdefault("symptoms", []).append({"concept_id": "SYM_HEADACHE", "severity": "unknown"})
            if "chief_complaint" not in delta:
                delta.update(
                    {
                        "chief_complaint": "SYM_HEADACHE",
                        "complaint_category": "headache",
                        "headache": "true",
                    }
                )
        if any(w in text for w in ("cough", "khansi", "खांसी", "खोकला")):
            delta.setdefault("symptoms", []).append({"concept_id": "SYM_COUGH", "severity": "unknown"})
            if "chief_complaint" not in delta:
                delta.update({"chief_complaint": "SYM_COUGH", "complaint_category": "cough"})
        if any(w in text for w in ("vomit", "ulti", "उल्टी")):
            delta["vomiting"] = "true"
        m = re.search(r"(\d+)\s*(day|days|din|दिवस)", text)
        if m:
            days = int(m.group(1))
            delta["duration"] = f"{days} days"
            delta["duration_days"] = days
        if "severe" in text or "tez" in text or "तीव्र" in text:
            delta["severity"] = "severe"
        elif "mild" in text or "halki" in text or "हलकी" in text:
            delta["severity"] = "mild"
        elif "moderate" in text:
            delta["severity"] = "moderate"
        if "no medicine" in text or "no medicines" in text or "कोई दवाई नहीं" in text:
            delta["medications"] = "none"
            delta["takes_medication"] = "false"
        if any(w in text for w in ("paracetamol", "bp tablet", "dolo", "crocin")):
            med = "paracetamol" if "paracetamol" in text or "crocin" in text or "dolo" in text else "BP tablet"
            delta["medications"] = [med]
            delta["takes_medication"] = "true"
        if "no allerg" in text or "allergy nahi" in text:
            delta["allergies"] = "none"
            delta["has_allergy"] = "false"
        if "don't know" in text or "i don't know" in text or "पता नहीं" in text:
            if "allerg" in text:
                delta["allergies"] = "unknown"
                delta["has_allergy"] = "unknown"
        if "cough" in text or "headache" in text or "body pain" in text:
            if delta.get("complaint_category") == "fever" or "fever" in text:
                delta["associated_symptoms_checked"] = "true"
        return json.dumps(delta)


def _stub_summary(user: str) -> str:
    try:
        payload = json.loads(user) if user.strip().startswith("{") else {"raw": user}
    except json.JSONDecodeError:
        payload = {"raw": user}
    complaint = payload.get("chief_complaint", "unspecified complaint")
    duration = payload.get("duration", "duration not provided")
    meds = payload.get("medications", "unknown")
    allergy = payload.get("allergies", "unknown")
    return (
        f"Patient reports {complaint}, duration {duration}. "
        f"Medications: {meds}. Allergy status: {allergy}. "
        "No interpretation added."
    )


def _stub_confirm(user: str) -> str:
    return (
        "Here is what I understood. Please check it is correct. "
        "You can go back if something is wrong."
    )


def _extract_json(text: str) -> dict[str, Any]:
    text = text.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?", "", text).strip()
        text = re.sub(r"```$", "", text).strip()
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.S)
    if match:
        data = json.loads(match.group(0))
        if isinstance(data, dict):
            return data
    raise ValueError("LLM did not return JSON")


class LLMGateway:
    def __init__(self, providers: list[LLMProvider] | None = None) -> None:
        self.providers = providers or _default_providers()

    @property
    def model_version(self) -> str:
        if not self.providers:
            return "none"
        p = self.providers[0]
        return f"{p.name}:{p.model_id}"

    def extract(self, utterance: str, collected: CollectedFields, language: str) -> ExtractionDelta:
        system = SYSTEM_PROMPT.format(concepts=canonical_concept_prompt_block())
        user = json.dumps(
            {
                "language": language,
                "collected_fields": collected.model_dump(),
                "patient_utterance": utterance,
            },
            ensure_ascii=False,
        )
        raw = self._complete_with_failover(system, user)
        try:
            data = _extract_json(raw)
            return ExtractionDelta.model_validate(data)
        except Exception as first_err:
            retry_user = user + f"\n\nVALIDATION_ERROR: {first_err}. Return corrected JSON only."
            raw2 = self._complete_with_failover(system, retry_user)
            data = _extract_json(raw2)
            return ExtractionDelta.model_validate(data)

    def summarize_clinical(self, fields: CollectedFields) -> str:
        raw = self._complete_with_failover(SUMMARY_PROMPT, json.dumps(fields.model_dump(), ensure_ascii=False))
        text = raw.strip().strip('"')
        return _strip_clinical_leaks(text)

    def summarize_patient(self, fields: CollectedFields, language: str) -> str:
        system = CONFIRM_PROMPT.format(language=language)
        raw = self._complete_with_failover(system, json.dumps(fields.model_dump(), ensure_ascii=False))
        return _strip_clinical_leaks(raw.strip().strip('"'))

    def _complete_with_failover(self, system: str, user: str) -> str:
        errors: list[str] = []
        for provider in self.providers:
            try:
                return provider.complete(system, user)
            except Exception as exc:  # noqa: BLE001 — failover is required for camp uptime
                logger.warning("LLM provider %s failed: %s", provider.name, exc)
                errors.append(f"{provider.name}: {exc}")
        raise RuntimeError("All LLM providers failed: " + "; ".join(errors))


def _strip_clinical_leaks(text: str) -> str:
    if DIAGNOSIS_LEAK.search(text):
        return re.sub(DIAGNOSIS_LEAK, "[removed]", text)
    return text


def _default_providers() -> list[LLMProvider]:
    providers: list[LLMProvider] = []
    if settings.groq_api_key:
        providers.append(GroqProvider(settings.groq_api_key, settings.llm_model))
    if settings.openrouter_api_key:
        providers.append(OpenRouterProvider(settings.openrouter_api_key, settings.openrouter_model))
    providers.append(KeywordStubProvider())
    return providers


gateway = LLMGateway()
