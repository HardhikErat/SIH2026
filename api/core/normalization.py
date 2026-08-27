"""Canonical clinical concept + synonym/dialect mapping — 14_AI_NLP §3 step 4."""

from __future__ import annotations

from dataclasses import dataclass

from core.schema import CollectedFields, SymptomItem


@dataclass(frozen=True)
class ClinicalConcept:
    id: str
    canonical_name: str
    category: str


CONCEPTS: list[ClinicalConcept] = [
    ClinicalConcept("SYM_FEVER", "fever", "symptom"),
    ClinicalConcept("SYM_COUGH", "cough", "symptom"),
    ClinicalConcept("SYM_COLD", "cold / runny nose", "symptom"),
    ClinicalConcept("SYM_SORE_THROAT", "sore throat", "symptom"),
    ClinicalConcept("SYM_HEADACHE", "headache", "symptom"),
    ClinicalConcept("SYM_CHEST_PAIN", "chest pain", "symptom"),
    ClinicalConcept("SYM_BREATHING", "breathing difficulty", "symptom"),
    ClinicalConcept("SYM_VOMITING", "vomiting", "symptom"),
    ClinicalConcept("SYM_BODY_PAIN", "body pain", "symptom"),
    ClinicalConcept("SYM_BACK_PAIN", "back pain", "symptom"),
    ClinicalConcept("SYM_STOMACH_PAIN", "stomach pain", "symptom"),
    ClinicalConcept("SYM_DIARRHEA", "diarrhea", "symptom"),
    ClinicalConcept("SYM_ABDOMINAL_PAIN", "abdominal pain", "symptom"),
    ClinicalConcept("SYM_DIZZINESS", "dizziness", "symptom"),
    ClinicalConcept("SYM_RASH", "rash", "symptom"),
    ClinicalConcept("SYM_FATIGUE", "fatigue", "symptom"),
    ClinicalConcept("SYM_OTHER", "other symptom", "symptom"),
]

# language, dialect, synonym → concept_id
SYNONYMS: list[tuple[str, str | None, str, str]] = [
    ("en", None, "fever", "SYM_FEVER"),
    ("en", None, "high temperature", "SYM_FEVER"),
    ("en", None, "temperature", "SYM_FEVER"),
    ("hi", None, "bukhar", "SYM_FEVER"),
    ("hi", None, "bukhaar", "SYM_FEVER"),
    ("hi", None, "बुखार", "SYM_FEVER"),
    ("hi", None, "बोकार", "SYM_FEVER"),
    ("hi", None, "बुकार", "SYM_FEVER"),
    ("hi", None, "jvara", "SYM_FEVER"),
    ("hi", None, "tap", "SYM_FEVER"),
    ("mr", None, "ताप", "SYM_FEVER"),
    ("mr", None, "kaaychal", "SYM_FEVER"),
    ("mr", None, "कायचळ", "SYM_FEVER"),
    ("en", None, "cough", "SYM_COUGH"),
    ("hi", None, "khansi", "SYM_COUGH"),
    ("hi", None, "खांसी", "SYM_COUGH"),
    ("mr", None, "खोकला", "SYM_COUGH"),
    ("en", None, "cold", "SYM_COLD"),
    ("en", None, "runny nose", "SYM_COLD"),
    ("hi", None, "सर्दी", "SYM_COLD"),
    ("en", None, "sore throat", "SYM_SORE_THROAT"),
    ("hi", None, "गले में खराश", "SYM_SORE_THROAT"),
    ("mr", None, "घसा दुखणे", "SYM_SORE_THROAT"),
    ("en", None, "headache", "SYM_HEADACHE"),
    ("en", None, "head pain", "SYM_HEADACHE"),
    ("hi", None, "sir dard", "SYM_HEADACHE"),
    ("hi", None, "सिर दर्द", "SYM_HEADACHE"),
    ("mr", None, "डोकेदुखी", "SYM_HEADACHE"),
    ("en", None, "chest pain", "SYM_CHEST_PAIN"),
    ("en", None, "chest ache", "SYM_CHEST_PAIN"),
    ("hi", None, "sine mein dard", "SYM_CHEST_PAIN"),
    ("hi", None, "सीने में दर्द", "SYM_CHEST_PAIN"),
    ("mr", None, "छाती दुखणे", "SYM_CHEST_PAIN"),
    ("en", None, "breathing difficulty", "SYM_BREATHING"),
    ("en", None, "shortness of breath", "SYM_BREATHING"),
    ("en", None, "can't breathe", "SYM_BREATHING"),
    ("hi", None, "saans", "SYM_BREATHING"),
    ("hi", None, "सांस लेने में तकलीफ", "SYM_BREATHING"),
    ("mr", None, "श्वास लागणे", "SYM_BREATHING"),
    ("en", None, "vomiting", "SYM_VOMITING"),
    ("hi", None, "ulti", "SYM_VOMITING"),
    ("hi", None, "उल्टी", "SYM_VOMITING"),
    ("en", None, "body pain", "SYM_BODY_PAIN"),
    ("en", None, "body ache", "SYM_BODY_PAIN"),
    ("hi", None, "badan dard", "SYM_BODY_PAIN"),
    ("hi", None, "बदन दर्द", "SYM_BODY_PAIN"),
    ("en", None, "back pain", "SYM_BACK_PAIN"),
    ("en", None, "backache", "SYM_BACK_PAIN"),
    ("hi", None, "kamar dard", "SYM_BACK_PAIN"),
    ("hi", None, "पीठ दर्द", "SYM_BACK_PAIN"),
    ("mr", None, "पाठदुखी", "SYM_BACK_PAIN"),
    ("en", None, "stomach pain", "SYM_STOMACH_PAIN"),
    ("en", None, "abdominal pain", "SYM_STOMACH_PAIN"),
    ("hi", None, "pet dard", "SYM_STOMACH_PAIN"),
    ("hi", None, "पेट दर्द", "SYM_STOMACH_PAIN"),
    ("en", None, "diarrhea", "SYM_DIARRHEA"),
    ("hi", None, "dast", "SYM_DIARRHEA"),
    ("hi", None, "दस्त", "SYM_DIARRHEA"),
    ("en", None, "dizziness", "SYM_DIZZINESS"),
    ("hi", None, "चक्कर", "SYM_DIZZINESS"),
    ("en", None, "rash", "SYM_RASH"),
    ("en", None, "fatigue", "SYM_FATIGUE"),
    ("en", None, "sick", "SYM_OTHER"),
    ("en", None, "unwell", "SYM_OTHER"),
    ("hi", None, "bimaar", "SYM_OTHER"),
    ("hi", None, "बीमार", "SYM_OTHER"),
    ("hi", None, "बीमारी", "SYM_OTHER"),
]


def _index() -> dict[str, str]:
    idx: dict[str, str] = {}
    for _lang, _dialect, synonym, concept_id in SYNONYMS:
        idx[synonym.casefold()] = concept_id
    for c in CONCEPTS:
        idx[c.canonical_name.casefold()] = c.id
        idx[c.id.casefold()] = c.id
    return idx


_SYNONYM_INDEX = _index()


def normalize_term(raw: str) -> tuple[str | None, bool]:
    """Return (concept_id | None, mapped). Unmapped terms stay as free text."""
    key = raw.strip().casefold()
    if key in _SYNONYM_INDEX:
        return _SYNONYM_INDEX[key], True
    return None, False


def normalize_fields(fields: CollectedFields) -> tuple[CollectedFields, list[str]]:
    """Map extracted terms to canonical IDs. Unmapped stored as free text + review flag."""
    review: list[str] = []
    data = fields.model_dump()
    if fields.chief_complaint and not fields.chief_complaint.startswith("SYM_"):
        cid, mapped = normalize_term(fields.chief_complaint)
        if mapped and cid:
            data["chief_complaint"] = cid
        else:
            review.append(fields.chief_complaint)
    symptoms: list[SymptomItem] = []
    for s in fields.symptoms:
        if s.concept_id.startswith("SYM_"):
            symptoms.append(s)
            continue
        cid, mapped = normalize_term(s.concept_id)
        if mapped and cid:
            symptoms.append(s.model_copy(update={"concept_id": cid, "raw_term": s.concept_id}))
        else:
            review.append(s.concept_id)
            symptoms.append(s)
    data["symptoms"] = [s.model_dump() if isinstance(s, SymptomItem) else s for s in symptoms]
    category_map = {
        "SYM_FEVER": "fever",
        "SYM_CHEST_PAIN": "chest_pain",
        "SYM_HEADACHE": "headache",
        "SYM_COUGH": "cough",
        "SYM_BREATHING": "chest_pain",
    }
    cc = data.get("chief_complaint")
    if cc in category_map and not data.get("complaint_category"):
        data["complaint_category"] = category_map[cc]
    return CollectedFields.model_validate(data), review


def canonical_concept_prompt_block() -> str:
    lines = [f"- {c.id}: {c.canonical_name} ({c.category})" for c in CONCEPTS]
    examples = ", ".join(f"{syn}→{cid}" for _l, _d, syn, cid in SYNONYMS[:20])
    return "Canonical concepts:\n" + "\n".join(lines) + "\nKnown synonyms: " + examples
