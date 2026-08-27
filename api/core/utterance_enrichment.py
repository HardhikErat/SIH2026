"""Deterministic utterance enrichment — catches clear answers the LLM may miss.

Runs after LLM extraction and before merge/question selection so short replies
like "mild", "चार", "2", ASR-garbled "बोकार"→fever always update structured state.
"""

from __future__ import annotations

import re
from typing import Any

from core.schema import CollectedFields

_SEVERITY_RE = re.compile(
    r"\b(mild|moderate|severe|halki|halk[aā]|tez|madhyam|मध्यम|हलकी|तीव्र)\b",
    re.I,
)

_SEVERITY_MAP = {
    "mild": "mild",
    "halki": "mild",
    "halka": "mild",
    "halkā": "mild",
    "हलकी": "mild",
    "moderate": "moderate",
    "madhyam": "moderate",
    "मध्यम": "moderate",
    "severe": "severe",
    "tez": "severe",
    "तीव्र": "severe",
}

_YES_RE = re.compile(r"^\s*(yes|y|haan|han|ha|हाँ|हां|होय|ji)\b", re.I)

_COMMON_MEDS = (
    "paracetamol",
    "acetaminophen",
    "crocin",
    "dolo",
    "ibuprofen",
    "aspirin",
    "azithromycin",
    "amoxicillin",
    "cetirizine",
    "allegra",
    "pantoprazole",
    "omeprazole",
    "metformin",
    "bp tablet",
    "blood pressure tablet",
)

_DECLINE_NAME_RE = re.compile(
    r"\b("
    r"don'?t know|do not know|dont know|"
    r"don'?t remember|do not remember|forgot|"
    r"not sure|unsure|"
    r"prefer not|don'?t want|do not want|"
    r"pata nahi|yaad nahi|याद नहीं|पता नहीं|"
    r"nothing|none|skip"
    r")\b",
    re.I,
)

# ASR / typing variants → canonical token (applied before matching)
_ASR_FIXES: list[tuple[str, str]] = [
    # fever / बुखार (very common voice errors)
    ("बोकार", "बुखार"),
    ("बुकार", "बुखार"),
    ("बूकर", "बुखार"),
    ("बू कर", "बुखार"),
    ("बु कर", "बुखार"),
    ("बुखर", "बुखार"),
    ("भुखार", "बुखार"),
    ("बखार", "बुखार"),
    ("bokar", "bukhar"),
    ("bukar", "bukhar"),
    ("bukaar", "bukhar"),
    ("boo kar", "bukhar"),
    ("bu kar", "bukhar"),
    ("bukhaar", "bukhar"),
    # sick / बीमार
    ("बिबार", "बीमार"),
    ("बिमर", "बीमार"),
    ("बिमार", "बीमार"),
    ("बिमारी", "बीमारी"),
    ("बिबारी", "बीमारी"),
    ("bibaar", "bimaar"),
    ("bibar", "bimaar"),
    ("bimar", "bimaar"),
    # duration unit
    ("तकलिफ", "तकलीफ"),
    ("तकलिफ़", "तकलीफ"),
    ("देन", "दिन"),
    ("दिनो", "दिन"),
    ("den se", "din se"),
    # Hinglish number spellings often from voice
    ("chaar", "चार"),
    ("paanch", "पाँच"),
    ("panch", "पाँच"),
    ("baarah", "बारह"),
    ("barah", "बारह"),
]

_HINDI_NUM: dict[str, int] = {
    # Devanagari
    "एक": 1,
    "दो": 2,
    "तीन": 3,
    "चार": 4,
    "पाँच": 5,
    "पांच": 5,
    "छह": 6,
    "छे": 6,
    "सात": 7,
    "आठ": 8,
    "नौ": 9,
    "दस": 10,
    "ग्यारह": 11,
    "बारह": 12,
    "पंद्रह": 15,
    "बीस": 20,
    "तीस": 30,
    # Marathi (common spoken forms)
    "एकच": 1,
    "दोन": 2,
    "तीनच": 3,
    "चारच": 4,
    "पाच": 5,
    "सहा": 6,
    "सातच": 7,
    "आठच": 8,
    "नऊ": 9,
    "दहा": 10,
    # Hinglish / romanized (voice & keyboard) — include long spellings first via sort
    "ek": 1,
    "aik": 1,
    "one": 1,
    "do": 2,
    "don": 2,  # Marathi दोन romanized
    "dho": 2,
    "two": 2,
    "teen": 3,
    "tin": 3,
    "three": 3,
    "chaar": 4,
    "char": 4,
    "vaar": 4,
    "four": 4,
    "paanch": 5,
    "panch": 5,
    "paach": 5,
    "five": 5,
    "chhe": 6,
    "chhah": 6,
    "che": 6,
    "six": 6,
    "saat": 7,
    "sath": 7,
    "seven": 7,
    "aath": 8,
    "aat": 8,
    "ath": 8,
    "eight": 8,
    "nau": 9,
    "nao": 9,
    "nine": 9,
    "das": 10,
    "dus": 10,
    "dahaa": 10,
    "ten": 10,
    "baarah": 12,
    "barah": 12,
    "pandrah": 15,
    "bees": 20,
    "tees": 30,
}

# Devanagari digits → ASCII
_DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")

# (phrase, concept_id, complaint_category, optional clinical flag)
_SYMPTOM_PHRASES: list[tuple[str, str, str, str | None]] = [
    ("fever", "SYM_FEVER", "fever", "fever"),
    ("bukhar", "SYM_FEVER", "fever", "fever"),
    ("बुखार", "SYM_FEVER", "fever", "fever"),
    ("ताप", "SYM_FEVER", "fever", "fever"),
    ("back pain", "SYM_BACK_PAIN", "default", None),
    ("backache", "SYM_BACK_PAIN", "default", None),
    ("lower back", "SYM_BACK_PAIN", "default", None),
    ("पीठ दर्द", "SYM_BACK_PAIN", "default", None),
    ("पीठ में दर्द", "SYM_BACK_PAIN", "default", None),
    ("kamar dard", "SYM_BACK_PAIN", "default", None),
    ("kamar mein dard", "SYM_BACK_PAIN", "default", None),
    ("पाठदुखी", "SYM_BACK_PAIN", "default", None),
    ("body pain", "SYM_BODY_PAIN", "default", None),
    ("body ache", "SYM_BODY_PAIN", "default", None),
    ("badan dard", "SYM_BODY_PAIN", "default", None),
    ("बदन दर्द", "SYM_BODY_PAIN", "default", None),
    ("शरीर में दर्द", "SYM_BODY_PAIN", "default", None),
    ("अंगदुखी", "SYM_BODY_PAIN", "default", None),
    ("stomach pain", "SYM_STOMACH_PAIN", "default", None),
    ("abdominal pain", "SYM_STOMACH_PAIN", "default", None),
    ("पेट दर्द", "SYM_STOMACH_PAIN", "default", None),
    ("pet dard", "SYM_STOMACH_PAIN", "default", None),
    ("पोटदुखी", "SYM_STOMACH_PAIN", "default", None),
    ("headache", "SYM_HEADACHE", "headache", "headache"),
    ("sir dard", "SYM_HEADACHE", "headache", "headache"),
    ("सिर दर्द", "SYM_HEADACHE", "headache", "headache"),
    ("सिरदर्द", "SYM_HEADACHE", "headache", "headache"),
    ("डोकेदुखी", "SYM_HEADACHE", "headache", "headache"),
    ("cough", "SYM_COUGH", "cough", None),
    ("khansi", "SYM_COUGH", "cough", None),
    ("खांसी", "SYM_COUGH", "cough", None),
    ("खोकला", "SYM_COUGH", "cough", None),
    ("chest pain", "SYM_CHEST_PAIN", "chest_pain", "chest_pain"),
    ("सीने में दर्द", "SYM_CHEST_PAIN", "chest_pain", "chest_pain"),
    ("sine mein dard", "SYM_CHEST_PAIN", "chest_pain", "chest_pain"),
    ("छातीत दुखणे", "SYM_CHEST_PAIN", "chest_pain", "chest_pain"),
    ("vomiting", "SYM_VOMITING", "default", "vomiting"),
    ("उल्टी", "SYM_VOMITING", "default", "vomiting"),
    ("ulti", "SYM_VOMITING", "default", "vomiting"),
    ("उलटी", "SYM_VOMITING", "default", "vomiting"),
    ("diarrhea", "SYM_DIARRHEA", "default", None),
    ("dast", "SYM_DIARRHEA", "default", None),
    ("दस्त", "SYM_DIARRHEA", "default", None),
    ("जुलाब", "SYM_DIARRHEA", "default", None),
    ("dizziness", "SYM_DIZZINESS", "default", None),
    ("चक्कर", "SYM_DIZZINESS", "default", None),
    ("sore throat", "SYM_SORE_THROAT", "default", None),
    ("गले में खराश", "SYM_SORE_THROAT", "default", None),
    ("घसा दुखणे", "SYM_SORE_THROAT", "default", None),
    ("cold", "SYM_COLD", "default", None),
    ("सर्दी", "SYM_COLD", "default", None),
    ("runny nose", "SYM_COLD", "default", None),
    ("rash", "SYM_RASH", "default", None),
    ("चकत्ते", "SYM_RASH", "default", None),
    ("पुरळ", "SYM_RASH", "default", None),
    ("fatigue", "SYM_FATIGUE", "default", None),
    ("thakaan", "SYM_FATIGUE", "default", None),
    ("थकान", "SYM_FATIGUE", "default", None),
    ("थकवा", "SYM_FATIGUE", "default", None),
]

_SICK_RE = re.compile(
    r"("
    r"\bbimaar\b|\bbimar\b|\bsick\b|\bill\b|\bunwell\b|"
    r"\bbimari\b|\btakleef\b|\btaklif\b|"
    r"बीमार|बीमारी|तकलीफ|तबियत"
    r")",
    re.I,
)


def normalize_patient_text(utterance: str) -> str:
    """Fix common ASR/typing misspellings before lexical matching."""
    text = (utterance or "").strip()
    if not text:
        return text
    out = text
    for bad, good in _ASR_FIXES:
        out = re.sub(re.escape(bad), good, out, flags=re.I)
    # Collapse "बू  कर" style spacing after fixes
    out = re.sub(r"\s+", " ", out).strip()
    return out


def enrich_utterance_delta(
    utterance: str,
    delta: dict[str, Any],
    *,
    pending_field: str | None = None,
    collected: CollectedFields | None = None,
) -> dict[str, Any]:
    """Merge high-confidence lexical facts into the extraction delta."""
    raw = (utterance or "").strip()
    if not raw:
        return delta

    text = normalize_patient_text(raw)
    out = dict(delta)
    lower = text.casefold()

    sev = _parse_severity(lower)
    if not sev and re.search(r"(badht|बढ़त|worse|worsening|tez ho|तीव्र हो)", lower):
        sev = "moderate"
    if sev and (
        pending_field == "severity"
        or out.get("severity") in (None, "unknown")
        or "severity" not in out
    ):
        out["severity"] = sev

    # --- Medications ---
    named = _extract_med_names(lower)
    if named:
        out["medications"] = named
        out["takes_medication"] = "true"
    elif pending_field in ("medications", "takes_medication"):
        if _is_no(lower) and "medications" not in out:
            out["medications"] = "none"
            out["takes_medication"] = "false"
        elif _declined_med_name(lower):
            if (collected and collected.takes_medication == "true") or pending_field == "medications":
                if re.search(r"\b(yes|taking|le raha|ले रहा)\b", lower) or (
                    collected and collected.takes_medication == "true"
                ):
                    out["takes_medication"] = "true"
                    out["medications"] = "unspecified"
                elif _is_no(lower):
                    out["medications"] = "none"
                    out["takes_medication"] = "false"
                else:
                    out["takes_medication"] = out.get("takes_medication") or (
                        collected.takes_medication if collected else "true"
                    )
                    if out["takes_medication"] in (None, "unknown"):
                        out["takes_medication"] = "true"
                    out["medications"] = "unspecified"
        elif _is_yes(lower) or re.search(r"\b(taking|take|le raha|ले रहा)\s+medicin", lower):
            out["takes_medication"] = "true"

    if pending_field in ("allergies", "has_allergy"):
        if _is_no(lower) and "allergies" not in out:
            out["allergies"] = "none"
            out["has_allergy"] = "false"
        elif _is_yes(lower) and "has_allergy" not in out:
            out["has_allergy"] = "true"

    if pending_field in (
        "breathing_difficulty",
        "fever",
        "vomiting",
        "headache",
        "chest_pain",
        "associated_symptoms_checked",
    ):
        if _is_no(lower) and pending_field not in out:
            if pending_field == "associated_symptoms_checked":
                out["associated_symptoms_checked"] = "true"
            else:
                out[pending_field] = "false"
        elif _is_yes(lower) and pending_field not in out:
            out[pending_field] = "true"

    if re.search(r"\b(no|nahi|नहीं)\s+(medicine|medicines|meds|dawai|दवाई)", lower):
        out.setdefault("medications", "none")
        out.setdefault("takes_medication", "false")
    if re.search(r"\b(no|nahi|नहीं)\s+(allerg(?:y|ies)|एलर्जी)", lower):
        out.setdefault("allergies", "none")
        out.setdefault("has_allergy", "false")

    # Duration — including bare "2" / "चार" when duration was just asked
    if "duration_days" not in out and out.get("duration") in (None, "unknown", ""):
        days = _parse_duration_days(text, pending_field=pending_field)
        if days is not None:
            out["duration"] = f"{days} days"
            out["duration_days"] = days

    # Symptoms / chief complaint
    need_complaint = (
        pending_field == "chief_complaint"
        or collected is None
        or not collected.is_collected("chief_complaint")
    )
    if need_complaint or "chief_complaint" not in out:
        matched = _match_symptom(lower, text)
        if matched:
            concept_id, category, flag = matched
            out.setdefault("chief_complaint", concept_id)
            out.setdefault("complaint_category", category)
            out.setdefault("symptoms", [])
            if isinstance(out["symptoms"], list) and not any(
                isinstance(s, dict) and s.get("concept_id") == concept_id for s in out["symptoms"]
            ):
                out["symptoms"].append(
                    {"concept_id": concept_id, "raw_term": text[:80], "severity": "unknown"}
                )
            if flag:
                out.setdefault(flag, "true")
        elif need_complaint and _SICK_RE.search(text) and "chief_complaint" not in out:
            out["chief_complaint"] = "SYM_OTHER"
            out["complaint_category"] = out.get("complaint_category") or "default"
            out.setdefault("symptoms", []).append(
                {"concept_id": "SYM_OTHER", "raw_term": text[:120], "severity": "unknown"}
            )
        elif (
            pending_field == "chief_complaint"
            and _is_substantive_complaint(text)
            and "chief_complaint" not in out
        ):
            out["chief_complaint"] = text[:160]
            out["complaint_category"] = out.get("complaint_category") or "default"

    if collected is not None and not collected.is_collected("severity") and sev:
        out["severity"] = sev

    return out


def close_medication_name_if_declined(
    utterance: str,
    merged: CollectedFields,
    *,
    pending_field: str | None,
    asked_questions: list[str],
) -> CollectedFields:
    """After the one name follow-up, accept unspecified so we never loop."""
    med_name_asked = any(qid.startswith("Q_MED_NAME:") for qid in asked_questions)
    if pending_field != "medications":
        return merged
    if not med_name_asked:
        return merged
    if merged.is_collected("medications"):
        return merged
    if merged.takes_medication != "true":
        return merged
    return merged.merge_delta({"medications": "unspecified", "takes_medication": "true"})


def _match_symptom(lower: str, original: str) -> tuple[str, str, str | None] | None:
    # Longer phrases first
    for phrase, concept_id, category, flag in sorted(
        _SYMPTOM_PHRASES, key=lambda x: len(x[0]), reverse=True
    ):
        if phrase.casefold() in lower or phrase in original:
            return concept_id, category, flag
    return None


def _parse_duration_days(text: str, *, pending_field: str | None = None) -> int | None:
    raw = (text or "").strip()
    # Normalize Devanagari digits ४ → 4
    raw = raw.translate(_DEVANAGARI_DIGITS)
    lower = raw.casefold().strip()
    compact = re.sub(r"\s+", " ", lower)
    # Longest number-words first so "chaar" wins over "char", "paanch" over "panch"
    num_words = sorted(_HINDI_NUM.items(), key=lambda kv: len(kv[0]), reverse=True)

    if any(w in compact for w in ("yesterday", "kal se", "कल से", "since yesterday")):
        return 1
    if any(
        w in compact
        for w in ("a week", "1 week", "one week", "ek hafte", "ek hapta", "एक हफ्ते", "hafte se", "एक आठवडा")
    ):
        return 7
    m = re.search(r"(\d+)\s*(?:week|weeks|hafte|हफ्ते|आठवड)", compact)
    if m:
        return int(m.group(1)) * 7

    # Digit + day unit
    m = re.search(r"(\d+)\s*(?:day|days|din|दिन|दिवस)", compact)
    if m:
        return int(m.group(1))

    # Number word + day unit (Hinglish / Hindi / Marathi)
    for word, n in num_words:
        if re.search(
            rf"(?<![\w\u0900-\u097F]){re.escape(word)}(?![\w\u0900-\u097F])\s*(?:din|day|days|दिन|दिवस)",
            compact,
            flags=re.I,
        ):
            return n
        if re.search(
            rf"(?<![\w\u0900-\u097F]){re.escape(word)}(?![\w\u0900-\u097F])\s*(?:से|se)\b",
            compact,
            flags=re.I,
        ):
            return n

    # When duration was the pending question, accept bare numbers / number words
    if pending_field == "duration":
        if re.fullmatch(r"\d{1,3}", compact):
            return int(compact)
        for word, n in num_words:
            if re.fullmatch(re.escape(word), compact, flags=re.I):
                return n
        # "लगभग चार" / "around chaar"
        for word, n in num_words:
            if re.search(
                rf"(?<![\w\u0900-\u097F]){re.escape(word)}(?![\w\u0900-\u097F])",
                compact,
                flags=re.I,
            ):
                return n

    # "4 din se" without requiring pending
    m = re.search(r"(\d+)\s*(?:din|day|days|दिन|दिवस)?\s*(?:se|से)?", compact)
    if m and re.search(r"(din|day|दिन|दिवस|se |से)", compact):
        return int(m.group(1))

    return None


def _is_substantive_complaint(text: str) -> bool:
    cleaned = re.sub(r"[^\w\u0900-\u097F\s]", "", text, flags=re.U).strip()
    if len(cleaned) < 3:
        return False
    if _is_yes(cleaned) or _is_no(cleaned):
        return False
    if re.fullmatch(r"(ok|okay|hmm|ji|हाँ|हां|theek|ठीक)", cleaned, flags=re.I):
        return False
    return True


def _extract_med_names(lower: str) -> list[str] | None:
    found: list[str] = []
    for med in _COMMON_MEDS:
        if med in lower:
            label = "BP tablet" if med in ("bp tablet", "blood pressure tablet") else med
            if label not in found:
                found.append(label)
    return found or None


def _declined_med_name(text: str) -> bool:
    return bool(_DECLINE_NAME_RE.search(text))


def _parse_severity(lower: str) -> str | None:
    for word, mapped in (
        ("severe", "severe"),
        ("तीव्र", "severe"),
        ("tez", "severe"),
        ("moderate", "moderate"),
        ("मध्यम", "moderate"),
        ("madhyam", "moderate"),
        ("mild", "mild"),
        ("हलकी", "mild"),
        ("halki", "mild"),
        ("halka", "mild"),
    ):
        if word in lower:
            return mapped
    m = _SEVERITY_RE.search(lower)
    if not m:
        return None
    return _SEVERITY_MAP.get(m.group(1).casefold(), _SEVERITY_MAP.get(m.group(1)))


def _is_yes(text: str) -> bool:
    return bool(_YES_RE.search(text)) and not _is_no(text)


def _is_no(text: str) -> bool:
    if re.search(r"\bno\s+nothing\b", text):
        return True
    if re.search(r"\b(nothing|none|nope|nil)\b", text):
        return True
    if re.search(r"\b(nahi|nahe+|नहीं|नाही)\b", text):
        return True
    if re.match(r"^\s*no\b", text):
        return True
    return False
