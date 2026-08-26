"""Deterministic utterance enrichment — catches clear answers the LLM may miss.

Runs after LLM extraction and before merge/question selection so short replies
like "mild", "the pain is mild", "no", "nothing" always update structured state.
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

_YES_RE = re.compile(r"^\s*(yes|y|haan|han|ha|हाँ|होय|ji)\b", re.I)

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


def enrich_utterance_delta(
    utterance: str,
    delta: dict[str, Any],
    *,
    pending_field: str | None = None,
    collected: CollectedFields | None = None,
) -> dict[str, Any]:
    """Merge high-confidence lexical facts into the extraction delta."""
    text = (utterance or "").strip()
    if not text:
        return delta

    out = dict(delta)
    lower = text.casefold()

    sev = _parse_severity(lower)
    if sev and (pending_field == "severity" or "severity" not in out or out.get("severity") in (None, "unknown")):
        if pending_field == "severity" or sev:
            out["severity"] = sev

    if pending_field == "severity" and "severity" not in out and sev:
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
            # Taking meds (or asked for name) but won't/can't name them
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
                    # Pure "don't remember" after name prompt
                    out["takes_medication"] = out.get("takes_medication") or (
                        collected.takes_medication if collected else "true"
                    )
                    if out["takes_medication"] in (None, "unknown"):
                        out["takes_medication"] = "true"
                    out["medications"] = "unspecified"
        elif _is_yes(lower) or re.search(r"\b(taking|take|le raha|ले रहा)\s+medicin", lower):
            out["takes_medication"] = "true"
            # Leave medications unset so the name follow-up can run once

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
            # "no nothing" on associated-symptoms question ⇒ checked, none present
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

    if pending_field == "duration" and "duration_days" not in out and "duration" not in out:
        m = re.search(r"(\d+)\s*(?:day|days|din|दिन)?", lower)
        if m:
            days = int(m.group(1))
            out["duration"] = f"{days} days"
            out["duration_days"] = days

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
    # Name was asked; this turn still has no name → stop asking
    return merged.merge_delta({"medications": "unspecified", "takes_medication": "true"})


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
