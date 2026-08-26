"""Build consultation summaries from structured fields (source of truth)."""

from __future__ import annotations

from typing import Any

from core.schema import CollectedFields, ConsultationSummary

_CONCEPT_LABELS = {
    "SYM_FEVER": "Fever",
    "SYM_COUGH": "Cough",
    "SYM_HEADACHE": "Headache",
    "SYM_CHEST_PAIN": "Chest pain",
    "SYM_BREATHING": "Breathing difficulty",
    "SYM_VOMITING": "Vomiting",
    "SYM_BODY_PAIN": "Body pain",
    "SYM_DIARRHEA": "Diarrhea",
    "SYM_ABDOMINAL_PAIN": "Abdominal pain",
}


def _label_concept(concept_id: str | None) -> str | None:
    if not concept_id:
        return None
    if concept_id in _CONCEPT_LABELS:
        return _CONCEPT_LABELS[concept_id]
    return concept_id.replace("SYM_", "").replace("_", " ").title()


def _meds_list(fields: CollectedFields) -> list[str]:
    meds = fields.medications
    if meds in (None, "unknown", "none"):
        return []
    if meds == "unspecified":
        return ["Taking medicine (name not provided)"]
    if isinstance(meds, list):
        return [str(m) for m in meds if str(m).strip()]
    return [str(meds)]


def build_summary_from_fields(fields: CollectedFields, language: str = "en") -> dict[str, Any]:
    """Deterministic summary so chips and summary always stay in sync."""
    symptoms: list[str] = []
    seen: set[str] = set()

    def add_symptom(label: str | None) -> None:
        if not label:
            return
        key = label.casefold()
        if key not in seen:
            seen.add(key)
            symptoms.append(label)

    add_symptom(_label_concept(fields.chief_complaint))
    for item in fields.symptoms:
        add_symptom(_label_concept(item.concept_id) or item.raw_term)
    if fields.fever == "true":
        add_symptom("Fever")
    if fields.headache == "true":
        add_symptom("Headache")
    if fields.vomiting == "true":
        add_symptom("Vomiting")
    if fields.chest_pain == "true":
        add_symptom("Chest pain")
    if fields.breathing_difficulty == "true":
        add_symptom("Breathing difficulty")

    meds = _meds_list(fields)
    observations: list[str] = []
    parts: list[str] = []
    if fields.severity not in (None, "unknown"):
        parts.append(f"{fields.severity} symptoms")
    if symptoms:
        parts.append(", ".join(symptoms))
    if fields.duration not in (None, "unknown"):
        parts.append(f"for {fields.duration}")
    if parts:
        observations.append("Patient reports " + " ".join(parts) + ".")
    if meds:
        observations.append("Medications: " + ", ".join(meds) + ".")
    if fields.allergies not in (None, "unknown"):
        if fields.allergies == "none":
            observations.append("No known allergies reported.")
        else:
            observations.append(f"Allergies: {fields.allergies}.")

    history: list[str] = []
    if isinstance(fields.medical_history, list):
        history = list(fields.medical_history)

    steps = ["Rest", "Drink fluids", "Consult a doctor for evaluation"]
    lang = (language or "en").split("-")[0]
    if lang == "hi":
        steps = ["आराम करें", "पर्याप्त पानी पिएं", "डॉक्टर से सलाह लें"]
    elif lang == "mr":
        steps = ["विश्रांती घ्या", "पाणी प्या", "डॉक्टरांचा सल्ला घ्या"]

    summary = ConsultationSummary(
        patient_name=fields.display_name,
        patient_age=fields.age,
        patient_gender=fields.gender if fields.gender != "unknown" else None,
        main_complaint=_label_concept(fields.chief_complaint) or fields.chief_complaint,
        symptoms=symptoms,
        duration=fields.duration if fields.duration != "unknown" else None,
        severity=fields.severity if fields.severity != "unknown" else None,
        medical_history=history,
        current_medications=meds,
        allergies=None if fields.allergies in (None, "unknown") else str(fields.allergies),
        observations=observations,
        recommended_next_steps=steps,
    )
    return summary.model_dump()


def merge_summary_with_fields(
    llm_summary: dict[str, Any] | None,
    fields: CollectedFields,
    language: str = "en",
) -> dict[str, Any]:
    """Prefer structured fields for facts; keep LLM wording for soft sections when useful."""
    base = build_summary_from_fields(fields, language)
    if not llm_summary:
        return base
    # Keep field-grounded facts
    for key in (
        "patient_name",
        "patient_age",
        "patient_gender",
        "main_complaint",
        "symptoms",
        "duration",
        "severity",
        "current_medications",
        "allergies",
    ):
        if base.get(key) not in (None, [], ""):
            llm_summary[key] = base[key]
    # Ensure observations mention meds if present
    if base.get("current_medications"):
        obs = list(llm_summary.get("observations") or [])
        med_line = "Medications: " + ", ".join(base["current_medications"]) + "."
        if not any("medication" in str(o).casefold() or "औषध" in str(o) for o in obs):
            obs.append(med_line)
        llm_summary["observations"] = obs or base.get("observations") or []
    if not llm_summary.get("recommended_next_steps"):
        llm_summary["recommended_next_steps"] = base["recommended_next_steps"]
    if not llm_summary.get("ai_disclaimer"):
        llm_summary["ai_disclaimer"] = base["ai_disclaimer"]
    return llm_summary
