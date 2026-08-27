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

SYSTEM_PROMPT = """You are a context-aware clinical intake documentation assistant.
You extract structured information from what a patient says. You do NOT diagnose, do NOT
suggest treatment, do NOT express clinical opinions. You never assign priority, urgency,
or triage flags.

Output contract: emit ONLY valid JSON matching the extraction schema. No prose.

Context rules (critical):
1) Read collected_fields and recent_turns carefully. Never invent facts the patient did not state.
2) Extract EVERY fact in the latest utterance — patients often pack multiple answers in one message.
3) If the patient corrects earlier information (e.g. "actually 5 days"), return the corrected value.
4) Understand Hindi, Hinglish, and English variants: "4 din se", "kal se", "yesterday se",
   "bimaar", "bukhar", "for the past week", "since Monday".
5) Short answers like "yes", "no", "4 din", "kal se" still count — map them to the pending field
   when recent_turns show what was asked.
6) Do not omit duration when the patient already said how long they have been sick.
7) Map symptoms to symptoms[] AND set matching clinical flags (fever/headache/etc.) when stated.

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
2) Patient: "4 din se bimaar hu"
   {{"duration":"4 days","duration_days":4,"chief_complaint":"SYM_FEVER","complaint_category":"default"}}
3) Patient: "I've been sick for 4 days and I have a headache since yesterday."
   {{"duration":"4 days","duration_days":4,"chief_complaint":"SYM_HEADACHE",
     "complaint_category":"headache","headache":"true",
     "symptoms":[{{"concept_id":"SYM_HEADACHE","duration":"1 day"}}]}}
4) Patient: "sine mein dard, saans lene mein takleef"
   {{"chief_complaint":"SYM_CHEST_PAIN","complaint_category":"chest_pain","chest_pain":"true","breathing_difficulty":"true"}}
5) Patient: "fever and cough, mild headache"
   {{"chief_complaint":"SYM_FEVER","complaint_category":"fever","fever":"true","associated_symptoms_checked":"true","symptoms":[{{"concept_id":"SYM_COUGH","severity":"unknown"}},{{"concept_id":"SYM_HEADACHE","severity":"mild"}}]}}
6) Earlier duration 4 days; now "Actually, it's been 5 days."
   {{"duration":"5 days","duration_days":5}}
7) Patient: "kal se headache hai"
   {{"chief_complaint":"SYM_HEADACHE","complaint_category":"headache",
     "headache":"true","duration":"1 day","duration_days":1}}
8) Earlier medications none; now "I took my BP tablet"
   {{"medications":["BP tablet"],"takes_medication":"true"}}
9) Patient: "no medicines"
   {{"medications":"none","takes_medication":"false"}}
10) Patient: "I don't know about allergies"
   {{"allergies":"unknown","has_allergy":"unknown"}}
"""

SUMMARY_PROMPT = """Given this structured intake JSON, write a 3-5 sentence factual
clinical summary for a doctor. State facts only. No interpretation, no suggested
diagnosis, no treatment advice. If a field is unknown, say it was not provided.
"""

CONFIRM_PROMPT = """Rewrite this structured intake as a short plain-language recap
for the patient in language code {language}. Short sentences, no medical jargon.
Do not add facts that are not in the JSON. Missing fields should be omitted, not guessed.
"""

REPLY_PROMPT = """INTAKE_REPLY_CONTRACT
You are a calm, context-aware clinical intake assistant speaking to a patient in language
code {language}. You do NOT diagnose, prescribe, suggest treatment, or assign urgency.
Write 1-3 short spoken sentences only — no markdown, no bullet lists, no JSON.

Rules:
1) Briefly acknowledge what the patient just said, using their words where possible.
2) Ask exactly the next question provided (next_hint). Do not invent extra clinical questions.
3) NEVER ask for information already present in collected_fields (especially duration,
   severity, symptoms, medications, allergies). If next_field is already answered, do not re-ask it.
4) If the patient just answered severity (mild/moderate/severe), do NOT ask severity again.
5) If next_field is NONE, thank them and say you will show a summary to check.
6) Reply only in the patient's language. Use English only if language starts with en.
7) Sound like a helpful human assistant, not a rigid questionnaire.
"""

DIAGNOSIS_LEAK = re.compile(
    r"\b("
    r"diagnos(?:is|e|ed|ing)|"
    r"prescribe|prescription|"
    r"treatment plan|"
    r"you should take\b"
    r")\b",
    re.I,
)


class LLMProvider(Protocol):
    name: str
    model_id: str

    def complete(self, system: str, user: str, *, json_mode: bool = False) -> str: ...


class GroqProvider:
    name = "groq"

    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model_id = model

    def complete(self, system: str, user: str, *, json_mode: bool = False) -> str:
        payload: dict[str, Any] = {
            "model": self.model_id,
            "temperature": 0 if json_mode else 0.3,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        with httpx.Client(timeout=30) as client:
            r = client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json=payload,
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]


class OpenRouterProvider:
    name = "openrouter"

    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model_id = model

    def complete(self, system: str, user: str, *, json_mode: bool = False) -> str:
        payload: dict[str, Any] = {
            "model": self.model_id,
            "temperature": 0 if json_mode else 0.3,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        }
        if json_mode:
            payload["response_format"] = {"type": "json_object"}
        with httpx.Client(timeout=45) as client:
            r = client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "HTTP-Referer": "https://sih2026-intake.vercel.app",
                },
                json=payload,
            )
            r.raise_for_status()
            return r.json()["choices"][0]["message"]["content"]


class GeminiProvider:
    name = "gemini"

    def __init__(self, api_key: str, model: str) -> None:
        self.api_key = api_key
        self.model_id = model

    def complete(self, system: str, user: str, *, json_mode: bool = False) -> str:
        generation: dict[str, Any] = {"temperature": 0 if json_mode else 0.3}
        if json_mode:
            generation["responseMimeType"] = "application/json"
        with httpx.Client(timeout=45) as client:
            r = client.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_id}:generateContent",
                params={"key": self.api_key},
                json={
                    "systemInstruction": {"parts": [{"text": system}]},
                    "contents": [{"role": "user", "parts": [{"text": user}]}],
                    "generationConfig": generation,
                },
            )
            r.raise_for_status()
            parts = r.json()["candidates"][0]["content"]["parts"]
            return "".join(p.get("text", "") for p in parts)


class KeywordStubProvider:
    """Offline/demo extractor so camps and CI run without a paid LLM key."""

    name = "stub"
    model_id = "keyword-stub-v1"

    def complete(self, system: str, user: str, *, json_mode: bool = False) -> str:
        if "INTAKE_REPLY_CONTRACT" in system:
            return _stub_reply(user)
        if "plain-language recap" in system.lower() or "patient in language" in system.lower():
            return _stub_confirm(user)
        if "clinical summary" in system.lower() or "3-5 sentence" in system.lower():
            return _stub_summary(user)
        utterance = user
        collected: dict[str, Any] = {}
        try:
            payload = json.loads(user)
            if isinstance(payload, dict) and payload.get("patient_utterance"):
                utterance = str(payload["patient_utterance"])
                collected = payload.get("collected_fields") or {}
        except json.JSONDecodeError:
            pass
        text = utterance.casefold()
        delta: dict[str, Any] = {}

        sick_like = any(
            w in text
            for w in (
                "bimaar",
                "bimar",
                "बीमार",
                "sick",
                "ill",
                "unwell",
                "takleef",
                "taklif",
                "तकलीफ",
            )
        )

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
        if any(w in text for w in ("headache", "sir dard", "सिर दर्द", "डोकेदुखी", "head pain")):
            delta.setdefault("symptoms", []).append({"concept_id": "SYM_HEADACHE", "severity": "unknown"})
            delta["headache"] = "true"
            if "chief_complaint" not in delta:
                delta.update(
                    {
                        "chief_complaint": "SYM_HEADACHE",
                        "complaint_category": "headache",
                    }
                )
        if any(w in text for w in ("cough", "khansi", "खांसी", "खोकला")):
            delta.setdefault("symptoms", []).append({"concept_id": "SYM_COUGH", "severity": "unknown"})
            if "chief_complaint" not in delta:
                delta.update({"chief_complaint": "SYM_COUGH", "complaint_category": "cough"})
        if any(w in text for w in ("body pain", "badan dard", "बदन दर्द", "angdukh", "body ache")):
            delta.setdefault("symptoms", []).append({"concept_id": "SYM_BODY_PAIN", "severity": "unknown"})
        if any(w in text for w in ("vomit", "ulti", "उल्टी")):
            delta["vomiting"] = "true"

        # Generic illness without a named symptom — keep as default complaint context
        if sick_like and "chief_complaint" not in delta:
            delta["complaint_category"] = delta.get("complaint_category") or "default"

        # Duration: "4 days", "4 din", "kal se", "yesterday", "a week", bare corrections
        days = _stub_parse_duration_days(text)
        if days is not None:
            delta["duration"] = f"{days} days"
            delta["duration_days"] = days
            # Per-symptom duration when headache mentioned with a shorter span
            if "headache" in text or "sir dard" in text or "सिर दर्द" in text:
                if "yesterday" in text or "kal se" in text or "कल से" in text:
                    for item in delta.get("symptoms") or []:
                        if item.get("concept_id") == "SYM_HEADACHE":
                            item["duration"] = "1 day"

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

        # Multiple symptoms alongside fever ⇒ associated symptoms already provided
        has_assoc = any(
            w in text for w in ("cough", "headache", "body pain", "khansi", "sir dard", "बदन")
        )
        if has_assoc and (
            delta.get("complaint_category") == "fever"
            or "fever" in text
            or "bukhar" in text
            or collected.get("complaint_category") == "fever"
        ):
            delta["associated_symptoms_checked"] = "true"

        return json.dumps(delta)


def _stub_parse_duration_days(text: str) -> int | None:
    """Parse duration from English / Hinglish / Hindi fragments."""
    # Explicit day counts: "4 days", "4 din", "4 दिनों"
    m = re.search(r"(\d+)\s*(?:day|days|din|दिवस|दिन|dino)", text)
    if m:
        return int(m.group(1))
    # Correction fragments: "actually 5", "actually, it's been 5"
    m = re.search(r"(?:actually|correction|sorry)\D{0,24}(\d+)\s*(?:day|days|din)?", text)
    if m:
        return int(m.group(1))
    # Bare number when clearly a duration answer: "5 days." already handled; "5" alone
    m = re.search(r"(?:^|\b)(\d{1,3})\s*(?:day|days|din)?(?:\s|$|\.)", text)
    if m and any(w in text for w in ("day", "din", "actually", "been", "se ", "से")):
        return int(m.group(1))
    # Relative: yesterday / kal
    if any(w in text for w in ("yesterday", "kal se", "कल से", "since yesterday")):
        return 1
    # Week
    if any(w in text for w in ("a week", "1 week", "one week", "ek hafte", "एक हफ्ते", "hafte se")):
        return 7
    if re.search(r"(\d+)\s*(?:week|weeks|hafte|हफ्ते)", text):
        m = re.search(r"(\d+)\s*(?:week|weeks|hafte|हफ्ते)", text)
        if m:
            return int(m.group(1)) * 7
    return None

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


def _stub_reply(user: str) -> str:
    try:
        payload = json.loads(user)
    except json.JSONDecodeError:
        payload = {}
    hint = str(payload.get("next_hint") or "").strip()
    utterance = str(payload.get("patient_utterance") or "").strip()
    lang = str(payload.get("language") or "en").split("-")[0].lower()
    done = {
        "en": "Thank you. I have enough to show you a summary. Please check it.",
        "hi": "धन्यवाद। मैंने सारांश तैयार कर लिया है। कृपया जाँच लें।",
        "mr": "धन्यवाद. मी सारांश तयार केला आहे. कृपया तपासा.",
    }
    noted = {
        "en": "I noted: {snippet}. {rest}",
        "hi": "मैंने नोट किया: {snippet}. {rest}",
        "mr": "मी नोंद केले: {snippet}. {rest}",
    }
    more = {
        "en": "Please tell me a little more.",
        "hi": "कृपया थोड़ा और बताइए।",
        "mr": "कृपया थोडे अधिक सांगा.",
    }
    more_general = {
        "en": "Please tell me a little more about what is bothering you.",
        "hi": "कृपया बताइए कि आपको क्या तकलीफ है।",
        "mr": "कृपया सांगा की तुम्हाला काय त्रास आहे.",
    }
    if payload.get("next_field") in (None, "", "NONE"):
        return done.get(lang, done["en"])
    if utterance:
        snippet = utterance[:80]
        rest = hint or more.get(lang, more["en"])
        return noted.get(lang, noted["en"]).format(snippet=snippet, rest=rest)
    return hint or more_general.get(lang, more_general["en"])


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

    def extract(
        self,
        utterance: str,
        collected: CollectedFields,
        language: str,
        recent_turns: list[str] | None = None,
    ) -> ExtractionDelta:
        system = SYSTEM_PROMPT.format(concepts=canonical_concept_prompt_block())
        user = json.dumps(
            {
                "language": language,
                "collected_fields": collected.model_dump(),
                "recent_turns": recent_turns or [],
                "patient_utterance": utterance,
            },
            ensure_ascii=False,
        )
        raw = self._complete_with_failover(system, user, json_mode=True)
        try:
            data = _extract_json(raw)
            return ExtractionDelta.model_validate(data)
        except Exception as first_err:
            retry_user = user + f"\n\nVALIDATION_ERROR: {first_err}. Return corrected JSON only."
            raw2 = self._complete_with_failover(system, retry_user, json_mode=True)
            data = _extract_json(raw2)
            return ExtractionDelta.model_validate(data)

    def summarize_clinical(self, fields: CollectedFields) -> str:
        raw = self._complete_with_failover(
            SUMMARY_PROMPT, json.dumps(fields.model_dump(), ensure_ascii=False), json_mode=False
        )
        text = raw.strip().strip('"')
        return _strip_clinical_leaks(text)

    def summarize_patient(self, fields: CollectedFields, language: str) -> str:
        system = CONFIRM_PROMPT.format(language=language)
        raw = self._complete_with_failover(system, json.dumps(fields.model_dump(), ensure_ascii=False), json_mode=False)
        return _strip_clinical_leaks(raw.strip().strip('"'))

    def generate_consultation_summary(self, fields: CollectedFields, language: str) -> dict[str, Any]:
        """Structured summary grounded in collected fields (LLM may polish wording)."""
        from core.schema import ConsultationSummary
        from core.summary_builder import build_summary_from_fields, merge_summary_with_fields

        grounded = build_summary_from_fields(fields, language)
        lang = (language or "en").split("-")[0].lower()
        lang_rule = (
            "Write EVERY patient-visible string (main_complaint, symptoms, duration, severity, "
            "observations, recommended_next_steps, allergies labels, ai_disclaimer, patient_gender) "
            f"entirely in language code '{lang}'. Do not mix in English except medicine brand names."
            if lang not in ("en", "english")
            else "Write all patient-visible strings in clear English."
        )
        system = (
            "You are a clinical assistant. Generate a structured consultation "
            f"summary for the patient in language code {language}. "
            "Output ONLY valid JSON matching the provided schema. "
            "Include patient details, main complaint, symptoms, duration, medications, allergies, and observations. "
            "Use ONLY facts from collected_fields — do not invent symptoms or medicines. "
            f"{lang_rule} "
            "Recommend sensible next steps appropriate for that language. "
            "Do NOT diagnose or prescribe medications."
        )
        user = json.dumps(
            {
                "collected_fields": fields.model_dump(),
                "schema": ConsultationSummary.model_json_schema(),
            },
            ensure_ascii=False,
        )
        try:
            raw = self._complete_with_failover(system, user, json_mode=True)
            data = _extract_json(raw)
            summary = ConsultationSummary.model_validate(data)
            return merge_summary_with_fields(summary.model_dump(), fields, language)
        except Exception as exc:
            logger.warning("Failed to generate structured consultation summary: %s", exc)
            return grounded
    def phrase_reply(
        self,
        utterance: str,
        collected: CollectedFields,
        language: str,
        *,
        next_field: str | None = None,
        next_hint: str | None = None,
    ) -> str:
        """Natural-language follow-up. Question Engine still chooses *what* to ask."""
        user = json.dumps(
            {
                "language": language,
                "patient_utterance": utterance,
                "collected_fields": collected.model_dump(),
                "next_field": next_field or "NONE",
                "next_hint": next_hint or "",
            },
            ensure_ascii=False,
        )
        try:
            raw = self._complete_with_failover(REPLY_PROMPT.format(language=language), user, json_mode=False)
            text = _strip_clinical_leaks(raw.strip().strip('"'))
            if text:
                return text
        except Exception as exc:  # noqa: BLE001
            logger.warning("LLM reply phrasing failed: %s", exc)
        if next_hint:
            return next_hint
        lang = language.split("-")[0]
        return {
            "en": "I have enough to show you a summary. Please check it.",
            "hi": "मैंने सारांश तैयार कर लिया है। कृपया देख लें।",
            "mr": "मी सारांश तयार केला आहे. कृपया तपासा.",
        }.get(lang, "I have enough to show you a summary. Please check it.")

    @property
    def live(self) -> bool:
        return any(p.name != "stub" for p in self.providers)

    def _complete_with_failover(self, system: str, user: str, *, json_mode: bool = False) -> str:
        errors: list[str] = []
        for provider in self.providers:
            try:
                return provider.complete(system, user, json_mode=json_mode)
            except Exception as exc:  # noqa: BLE001 — failover is required for camp uptime
                logger.warning("LLM provider %s failed: %s", provider.name, exc)
                errors.append(f"{provider.name}: {exc}")
        raise RuntimeError("All LLM providers failed: " + "; ".join(errors))


def _strip_clinical_leaks(text: str) -> str:
    """Remove unsafe clinical advice phrases without leaving '[removed]' placeholders."""
    cleaned = DIAGNOSIS_LEAK.sub("", text)
    cleaned = re.sub(r"\s{2,}", " ", cleaned)
    cleaned = re.sub(r"\s+([,.!?])", r"\1", cleaned)
    # Never surface the old placeholder if a prior model version left it in
    cleaned = cleaned.replace("[removed]", "").replace("  ", " ")
    return cleaned.strip()


def _default_providers() -> list[LLMProvider]:
    providers: list[LLMProvider] = []
    if settings.groq_api_key:
        providers.append(GroqProvider(settings.groq_api_key, settings.llm_model))
    if settings.openrouter_api_key:
        providers.append(OpenRouterProvider(settings.openrouter_api_key, settings.openrouter_model))
    if settings.gemini_api_key:
        providers.append(GeminiProvider(settings.gemini_api_key, settings.gemini_model))
    providers.append(KeywordStubProvider())
    return providers


gateway = LLMGateway()
