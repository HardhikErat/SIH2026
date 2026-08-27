"""Build consultation summaries from structured fields (source of truth).

Patient-facing summaries must be fully in the session language (values AND prose).
Doctor-facing English summaries use language="en".
"""

from __future__ import annotations

import re
from typing import Any

from core.schema import CollectedFields, ConsultationSummary

_CONCEPT_LABELS: dict[str, dict[str, str]] = {
    "en": {
        "SYM_FEVER": "Fever",
        "SYM_COUGH": "Cough",
        "SYM_COLD": "Cold / runny nose",
        "SYM_SORE_THROAT": "Sore throat",
        "SYM_HEADACHE": "Headache",
        "SYM_STOMACH_PAIN": "Stomach pain",
        "SYM_ABDOMINAL_PAIN": "Abdominal pain",
        "SYM_BODY_PAIN": "Body pain",
        "SYM_CHEST_PAIN": "Chest pain",
        "SYM_BREATHING": "Breathing difficulty",
        "SYM_SHORTNESS_OF_BREATH": "Shortness of breath",
        "SYM_DIARRHEA": "Diarrhea",
        "SYM_VOMITING": "Vomiting",
        "SYM_DIZZINESS": "Dizziness",
        "SYM_RASH": "Rash / skin issue",
        "SYM_FATIGUE": "Fatigue / weakness",
        "SYM_BACK_PAIN": "Back pain",
        "SYM_OTHER": "Other symptom",
    },
    "hi": {
        "SYM_FEVER": "बुखार",
        "SYM_COUGH": "खांसी",
        "SYM_COLD": "सर्दी / नाक बहना",
        "SYM_SORE_THROAT": "गले में खराश",
        "SYM_HEADACHE": "सिरदर्द",
        "SYM_STOMACH_PAIN": "पेट दर्द",
        "SYM_ABDOMINAL_PAIN": "पेट दर्द",
        "SYM_BODY_PAIN": "शरीर में दर्द",
        "SYM_CHEST_PAIN": "सीने में दर्द",
        "SYM_BREATHING": "सांस लेने में तकलीफ",
        "SYM_SHORTNESS_OF_BREATH": "सांस लेने में तकलीफ",
        "SYM_DIARRHEA": "दस्त",
        "SYM_VOMITING": "उल्टी",
        "SYM_DIZZINESS": "चक्कर आना",
        "SYM_RASH": "चकत्ते / त्वचा समस्या",
        "SYM_FATIGUE": "थकान / कमजोरी",
        "SYM_BACK_PAIN": "पीठ दर्द",
        "SYM_OTHER": "अन्य लक्षण",
    },
    "mr": {
        "SYM_FEVER": "ताप",
        "SYM_COUGH": "खोकला",
        "SYM_COLD": "सर्दी / नाक वाहणे",
        "SYM_SORE_THROAT": "घसा दुखणे",
        "SYM_HEADACHE": "डोकेदुखी",
        "SYM_STOMACH_PAIN": "पोटदुखी",
        "SYM_ABDOMINAL_PAIN": "पोटदुखी",
        "SYM_BODY_PAIN": "अंगदुखी",
        "SYM_CHEST_PAIN": "छातीत दुखणे",
        "SYM_BREATHING": "श्वास लागणे",
        "SYM_SHORTNESS_OF_BREATH": "श्वास लागणे",
        "SYM_DIARRHEA": "जुलाब",
        "SYM_VOMITING": "उलटी",
        "SYM_DIZZINESS": "चक्कर येणे",
        "SYM_RASH": "पुरळ / त्वचेची समस्या",
        "SYM_FATIGUE": "थकवा / अशक्तपणा",
        "SYM_BACK_PAIN": "पाठदुखी",
        "SYM_OTHER": "इतर लक्षण",
    },
}

# English free-text symptom labels → localized (when LLM/user left English text)
_EN_SYMPTOM_ALIASES: dict[str, dict[str, str]] = {
    "hi": {
        "fever": "बुखार",
        "cough": "खांसी",
        "cold": "सर्दी",
        "headache": "सिरदर्द",
        "body pain": "शरीर में दर्द",
        "stomach pain": "पेट दर्द",
        "abdominal pain": "पेट दर्द",
        "chest pain": "सीने में दर्द",
        "breathing difficulty": "सांस लेने में तकलीफ",
        "shortness of breath": "सांस लेने में तकलीफ",
        "diarrhea": "दस्त",
        "vomiting": "उल्टी",
        "dizziness": "चक्कर आना",
        "rash": "चकत्ते",
        "fatigue": "थकान",
        "back pain": "पीठ दर्द",
        "sore throat": "गले में खराश",
    },
    "mr": {
        "fever": "ताप",
        "cough": "खोकला",
        "cold": "सर्दी",
        "headache": "डोकेदुखी",
        "body pain": "अंगदुखी",
        "stomach pain": "पोटदुखी",
        "abdominal pain": "पोटदुखी",
        "chest pain": "छातीत दुखणे",
        "breathing difficulty": "श्वास लागणे",
        "shortness of breath": "श्वास लागणे",
        "diarrhea": "जुलाब",
        "vomiting": "उलटी",
        "dizziness": "चक्कर येणे",
        "rash": "पुरळ",
        "fatigue": "थकवा",
        "back pain": "पाठदुखी",
        "sore throat": "घसा दुखणे",
    },
}

_SEVERITY: dict[str, dict[str, str]] = {
    "en": {"mild": "mild", "moderate": "moderate", "severe": "severe"},
    "hi": {"mild": "हल्की", "moderate": "मध्यम", "severe": "गंभीर"},
    "mr": {"mild": "सौम्य", "moderate": "मध्यम", "severe": "तीव्र"},
}

_GENDER: dict[str, dict[str, str]] = {
    "en": {
        "male": "male",
        "female": "female",
        "other": "other",
        "prefer_not_to_say": "prefer not to say",
    },
    "hi": {
        "male": "पुरुष",
        "female": "महिला",
        "other": "अन्य",
        "prefer_not_to_say": "नहीं बताना चाहते",
    },
    "mr": {
        "male": "पुरुष",
        "female": "स्त्री",
        "other": "इतर",
        "prefer_not_to_say": "सांगू इच्छित नाही",
    },
}

_COPY: dict[str, dict[str, str]] = {
    "en": {
        "med_unspecified": "Taking medicine (name not provided)",
        "obs_reports": "Patient reports {detail}.",
        "obs_meds": "Medications: {meds}.",
        "obs_allergies_none": "No known allergies reported.",
        "obs_allergies": "Allergies: {allergies}.",
        "for_duration": "for {duration}",
        "severity_symptoms": "{severity} symptoms",
        "disclaimer": (
            "This is an AI-generated consultation summary, not a medical diagnosis. "
            "Please consult a qualified healthcare professional for proper evaluation and treatment."
        ),
        "step_rest": "Rest",
        "step_fluids": "Drink fluids",
        "step_doctor": "Consult a doctor for evaluation",
        "day": "day",
        "days": "days",
        "none": "none",
    },
    "hi": {
        "med_unspecified": "दवा ले रहे हैं (नाम नहीं बताया)",
        "obs_reports": "मरीज़ ने बताया: {detail}।",
        "obs_meds": "दवाइयाँ: {meds}।",
        "obs_allergies_none": "कोई ज्ञात एलर्जी नहीं बताई गई।",
        "obs_allergies": "एलर्जी: {allergies}।",
        "for_duration": "{duration} से",
        "severity_symptoms": "{severity} लक्षण",
        "disclaimer": (
            "यह एआई-जनित परामर्श सारांश है, चिकित्सकीय निदान नहीं। "
            "उचित मूल्यांकन और उपचार के लिए योग्य स्वास्थ्य पेशेवर से सलाह लें।"
        ),
        "step_rest": "आराम करें",
        "step_fluids": "पर्याप्त पानी पिएं",
        "step_doctor": "डॉक्टर से सलाह लें",
        "day": "दिन",
        "days": "दिन",
        "none": "none",
    },
    "mr": {
        "med_unspecified": "औषध घेत आहेत (नाव दिले नाही)",
        "obs_reports": "रुग्णाने सांगितले: {detail}.",
        "obs_meds": "औषधे: {meds}.",
        "obs_allergies_none": "कोणतीही ज्ञात अॅलर्जी नोंदवली नाही.",
        "obs_allergies": "अॅलर्जी: {allergies}.",
        "for_duration": "{duration} पासून",
        "severity_symptoms": "{severity} लक्षणे",
        "disclaimer": (
            "हा एआय-निर्मित सल्लागार सारांश आहे, वैद्यकीय निदान नाही. "
            "योग्य मूल्यांकन आणि उपचारासाठी पात्र आरोग्य व्यावसायिकाचा सल्ला घ्या."
        ),
        "step_rest": "विश्रांती घ्या",
        "step_fluids": "पाणी प्या",
        "step_doctor": "डॉक्टरांचा सल्ला घ्या",
        "day": "दिवस",
        "days": "दिवस",
        "none": "none",
    },
}


def _lang(language: str | None) -> str:
    raw = (language or "en").strip().lower().split("-")[0]
    if raw in ("hi", "hin", "hindi"):
        return "hi"
    if raw in ("mr", "mar", "marathi"):
        return "mr"
    return "en"


def _copy(language: str | None) -> dict[str, str]:
    return _COPY[_lang(language)]


def _label_concept(concept_id: str | None, language: str = "en") -> str | None:
    if not concept_id:
        return None
    lang = _lang(language)
    table = _CONCEPT_LABELS.get(lang) or _CONCEPT_LABELS["en"]
    if concept_id in table:
        return table[concept_id]
    # Try English table then localize free-text
    en = _CONCEPT_LABELS["en"].get(concept_id)
    if en:
        return _localize_symptom_text(en, language)
    if concept_id.startswith("SYM_"):
        return _localize_symptom_text(
            concept_id.replace("SYM_", "").replace("_", " ").title(),
            language,
        )
    return _localize_symptom_text(concept_id, language)


def _localize_symptom_text(text: str | None, language: str) -> str | None:
    if not text:
        return None
    lang = _lang(language)
    if lang == "en":
        return text
    aliases = _EN_SYMPTOM_ALIASES.get(lang) or {}
    key = text.strip().casefold()
    if key in aliases:
        return aliases[key]
    return text


def _severity_label(value: str | None, language: str) -> str | None:
    if not value or value == "unknown":
        return None
    key = str(value).strip().casefold()
    table = _SEVERITY.get(_lang(language)) or _SEVERITY["en"]
    return table.get(key, str(value))


def _gender_label(value: str | None, language: str) -> str | None:
    if not value or value == "unknown":
        return None
    key = str(value).strip().casefold()
    table = _GENDER.get(_lang(language)) or _GENDER["en"]
    return table.get(key, str(value))


def _format_duration(fields: CollectedFields, language: str) -> str | None:
    c = _copy(language)
    if fields.duration_days is not None:
        n = int(fields.duration_days)
        unit = c["day"] if n == 1 else c["days"]
        return f"{n} {unit}"

    raw = fields.duration
    if raw in (None, "unknown"):
        return None

    text = str(raw).strip()
    # Already looks non-English — keep
    if _lang(language) != "en" and re.search(r"[\u0900-\u097F]", text):
        return text

    m = re.search(r"(\d+)\s*(day|days|din|दिन|दिवस)?", text, re.I)
    if m:
        n = int(m.group(1))
        unit = c["day"] if n == 1 else c["days"]
        return f"{n} {unit}"

    # Common English phrases
    lower = text.casefold()
    if "week" in lower or "hafte" in lower or "हफ्ते" in lower:
        wm = re.search(r"(\d+)", text)
        weeks = int(wm.group(1)) if wm else 1
        n = weeks * 7
        return f"{n} {c['days']}"

    return text


def _meds_list(fields: CollectedFields, language: str) -> list[str]:
    c = _copy(language)
    meds = fields.medications
    if meds in (None, "unknown", "none"):
        return []
    if meds == "unspecified":
        return [c["med_unspecified"]]
    if isinstance(meds, list):
        return [str(m) for m in meds if str(m).strip()]
    return [str(meds)]


def build_summary_from_fields(fields: CollectedFields, language: str = "en") -> dict[str, Any]:
    """Deterministic, fully localized summary so chips and summary stay in sync."""
    c = _copy(language)
    symptoms: list[str] = []
    seen: set[str] = set()

    def add_symptom(label: str | None) -> None:
        if not label:
            return
        key = label.casefold()
        if key not in seen:
            seen.add(key)
            symptoms.append(label)

    add_symptom(_label_concept(fields.chief_complaint, language))
    for item in fields.symptoms:
        add_symptom(_label_concept(item.concept_id, language) or _localize_symptom_text(item.raw_term, language))
    if fields.fever == "true":
        add_symptom(_label_concept("SYM_FEVER", language))
    if fields.headache == "true":
        add_symptom(_label_concept("SYM_HEADACHE", language))
    if fields.vomiting == "true":
        add_symptom(_label_concept("SYM_VOMITING", language))
    if fields.chest_pain == "true":
        add_symptom(_label_concept("SYM_CHEST_PAIN", language))
    if fields.breathing_difficulty == "true":
        add_symptom(_label_concept("SYM_BREATHING", language))

    meds = _meds_list(fields, language)
    duration = _format_duration(fields, language)
    severity = _severity_label(
        None if fields.severity == "unknown" else str(fields.severity),
        language,
    )

    observations: list[str] = []
    parts: list[str] = []
    if severity:
        parts.append(c["severity_symptoms"].format(severity=severity))
    if symptoms:
        parts.append(", ".join(symptoms))
    if duration:
        parts.append(c["for_duration"].format(duration=duration))
    if parts:
        # Join naturally: "गंभीर लक्षण, शरीर में दर्द, 2 दिन से"
        detail = " ".join(parts) if _lang(language) == "en" else ", ".join(parts)
        if _lang(language) == "en":
            # Preserve prior English phrasing: "severe symptoms Body pain for 2 days"
            en_parts: list[str] = []
            if severity:
                en_parts.append(f"{severity} symptoms")
            if symptoms:
                en_parts.append(", ".join(symptoms))
            if duration:
                en_parts.append(f"for {duration}")
            observations.append("Patient reports " + " ".join(en_parts) + ".")
        else:
            observations.append(c["obs_reports"].format(detail=detail))

    if meds:
        observations.append(c["obs_meds"].format(meds=", ".join(meds)))
    if fields.allergies not in (None, "unknown"):
        if fields.allergies == "none":
            observations.append(c["obs_allergies_none"])
        else:
            observations.append(c["obs_allergies"].format(allergies=fields.allergies))

    history: list[str] = []
    if isinstance(fields.medical_history, list):
        history = list(fields.medical_history)

    steps = [c["step_rest"], c["step_fluids"], c["step_doctor"]]

    main = symptoms[0] if symptoms else _label_concept(fields.chief_complaint, language)
    if not main and fields.chief_complaint and not str(fields.chief_complaint).startswith("SYM_"):
        main = _localize_symptom_text(fields.chief_complaint, language)

    summary = ConsultationSummary(
        patient_name=fields.display_name,
        patient_age=fields.age,
        patient_gender=_gender_label(
            None if fields.gender == "unknown" else str(fields.gender),
            language,
        ),
        main_complaint=main or fields.chief_complaint,
        symptoms=symptoms,
        duration=duration,
        severity=severity,
        medical_history=history,
        current_medications=meds,
        allergies=None if fields.allergies in (None, "unknown") else str(fields.allergies),
        observations=observations,
        recommended_next_steps=steps,
        ai_disclaimer=c["disclaimer"],
    )
    return summary.model_dump()


def merge_summary_with_fields(
    llm_summary: dict[str, Any] | None,
    fields: CollectedFields,
    language: str = "en",
) -> dict[str, Any]:
    """Merge LLM output with field-grounded facts.

    For non-English patient languages, prefer the fully localized field-grounded
    summary so English LLM text cannot overwrite patient-facing strings.
    """
    base = build_summary_from_fields(fields, language)
    if not llm_summary:
        return base

    lang = _lang(language)

    # Non-English patient path: keep localized grounded content for all display fields.
    if lang != "en":
        out = dict(base)
        # Keep drug/brand names from LLM when useful (Latin names stay as-is).
        llm_meds = llm_summary.get("current_medications")
        if isinstance(llm_meds, list):
            cleaned = [
                str(m).strip()
                for m in llm_meds
                if str(m).strip()
                and str(m).strip().casefold()
                not in ("none specified", "none", "n/a", "unknown", "none reported")
            ]
            if cleaned and not out.get("current_medications"):
                out["current_medications"] = cleaned
            elif cleaned and out.get("current_medications"):
                # Prefer field meds; only fill if empty already handled
                pass
            elif cleaned:
                out["current_medications"] = cleaned
                c = _copy(language)
                obs = [o for o in (out.get("observations") or []) if "दवा" not in str(o) and "औषध" not in str(o)]
                obs.append(c["obs_meds"].format(meds=", ".join(cleaned)))
                out["observations"] = obs
        out["ai_disclaimer"] = base["ai_disclaimer"]
        out["recommended_next_steps"] = base["recommended_next_steps"]
        return out

    # English path: ground demographics / structured clinical facts from fields
    for key in (
        "patient_name",
        "patient_age",
        "patient_gender",
        "duration",
        "severity",
        "current_medications",
        "allergies",
        "main_complaint",
        "symptoms",
        "ai_disclaimer",
    ):
        if base.get(key) not in (None, [], ""):
            llm_summary[key] = base[key]

    if base.get("current_medications"):
        obs = list(llm_summary.get("observations") or [])
        med_line = "Medications: " + ", ".join(base["current_medications"]) + "."
        if not any("medication" in str(o).casefold() for o in obs):
            obs.append(med_line)
        llm_summary["observations"] = obs or base.get("observations") or []
    elif not llm_summary.get("observations"):
        llm_summary["observations"] = base.get("observations") or []

    if not llm_summary.get("recommended_next_steps"):
        llm_summary["recommended_next_steps"] = base["recommended_next_steps"]
    if not llm_summary.get("ai_disclaimer"):
        llm_summary["ai_disclaimer"] = base["ai_disclaimer"]

    # Prefer grounded English observations when LLM left them empty/weak
    if not llm_summary.get("observations"):
        llm_summary["observations"] = base["observations"]

    return llm_summary


def ensure_english_summary(
    fields: CollectedFields,
    existing_en: dict[str, Any] | None,
    generate_fn,
) -> dict[str, Any]:
    """Return an English consultation summary for doctor views (generate if missing)."""
    if existing_en:
        return existing_en
    return generate_fn(fields, "en")
