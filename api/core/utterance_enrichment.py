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
_NO_RE = re.compile(
    r"^\s*(no|n|nahi|nahe+|नहीं|नाही|none|nothing|nope|nil)\b|"
    r"\b(no|nothing|none|nahi|नहीं)\b",
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
        # Always accept an explicit severity word; prefer it when answering severity Q
        if pending_field == "severity" or sev:
            out["severity"] = sev

    # Pending-field short answers (yes/no / bare severity)
    if pending_field == "severity" and "severity" not in out:
        if sev:
            out["severity"] = sev

    if pending_field in ("medications", "takes_medication"):
        if _is_no(lower) and "medications" not in out:
            out["medications"] = "none"
            out["takes_medication"] = "false"
        elif _is_yes(lower) and "takes_medication" not in out:
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
            out[pending_field] = "false"
        elif _is_yes(lower) and pending_field not in out:
            out[pending_field] = "true"

    # Free-text "no medicine(s)" / "no allergy" even without pending field
    if re.search(r"\b(no|nahi|नहीं)\s+(medicine|medicines|meds|dawai|दवाई)", lower):
        out.setdefault("medications", "none")
        out.setdefault("takes_medication", "false")
    if re.search(r"\b(no|nahi|नहीं)\s+(allerg(?:y|ies)|एलर्जी)", lower):
        out.setdefault("allergies", "none")
        out.setdefault("has_allergy", "false")

    # Duration leftovers the LLM sometimes skips on short replies
    if pending_field == "duration" and "duration_days" not in out and "duration" not in out:
        m = re.search(r"(\d+)\s*(?:day|days|din|दिन)?", lower)
        if m:
            days = int(m.group(1))
            out["duration"] = f"{days} days"
            out["duration_days"] = days

    # If collected already has severity unknown and utterance clearly states it
    if collected is not None and not collected.is_collected("severity") and sev:
        out["severity"] = sev

    return out


def _parse_severity(lower: str) -> str | None:
    # Prefer the most specific word; avoid matching "severe" inside nonsense
    # Check mild before severe? "mild" doesn't contain severe. Order by word find.
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
    # "no nothing", "nothing", "no meds", bare "no"
    if re.search(r"\b(nothing|none|nope|nil)\b", text):
        return True
    if re.search(r"\b(nahi|nahe+|नहीं|नाही)\b", text):
        return True
    if re.match(r"^\s*no\b", text):
        return True
    if re.search(r"\bno\s+nothing\b", text):
        return True
    return False
