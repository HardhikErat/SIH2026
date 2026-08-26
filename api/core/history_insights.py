"""Analyze prior consultations against the current complaint for doctor review."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from core.aadhaar import mask_aadhaar
from core.llm_gateway import gateway
from core.schema import CollectedFields, HistoricalInsight

logger = logging.getLogger(__name__)

HISTORY_INSIGHT_PROMPT = """You are a clinical documentation assistant helping a doctor review a returning patient.
You do NOT diagnose or prescribe. Compare prior consultation records with the CURRENT intake only.

Return ONLY valid JSON:
{{
  "insights": [
    {{
      "relevance": "high|medium|low",
      "category": "symptom|medication|allergy|pattern|condition|other",
      "title": "short headline",
      "detail": "1-3 sentences explaining why this prior fact may matter for the current visit",
      "prior_intake_id": "id or null",
      "prior_date": "ISO date or null"
    }}
  ],
  "overview": "1-2 sentence overview for the doctor"
}}

Rules:
- Only cite facts present in prior_history or current_fields.
- Prefer high relevance for recurring complaints, related symptoms, meds, allergies, or escalating patterns.
- If nothing relevant, return an empty insights list and a short overview saying no linked history found.
"""


def _history_payload(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for row in rows:
        turns = row.get("turn_history") or []
        chat_preview = [
            {"speaker": t.get("speaker"), "text": (t.get("text") or "")[:240]}
            for t in turns
            if isinstance(t, dict) and t.get("text")
        ][:20]
        out.append(
            {
                "intake_id": row.get("id"),
                "created_at": row.get("created_at"),
                "chief_complaint": row.get("chief_complaint"),
                "duration": row.get("duration"),
                "symptoms": row.get("symptoms"),
                "medications": row.get("medications"),
                "allergies": row.get("allergies"),
                "ai_summary": row.get("ai_summary"),
                "consultation_summary": row.get("consultation_summary"),
                "priority_flag": row.get("priority_flag"),
                "status": row.get("status"),
                "chat_preview": chat_preview,
            }
        )
    return out


def _stub_insights(
    current: CollectedFields, history: list[dict[str, Any]]
) -> tuple[list[dict[str, Any]], str]:
    insights: list[dict[str, Any]] = []
    current_complaint = (current.chief_complaint or "").upper()
    current_cat = (current.complaint_category or "").lower()

    for row in history:
        prior_complaint = str(row.get("chief_complaint") or "").upper()
        prior_id = row.get("id")
        prior_date = row.get("created_at")
        if prior_complaint and (
            prior_complaint == current_complaint
            or (current_cat and current_cat in prior_complaint.lower())
            or (current_complaint and current_complaint.replace("SYM_", "") in prior_complaint)
        ):
            insights.append(
                {
                    "relevance": "high",
                    "category": "pattern",
                    "title": "Recurring or related chief complaint",
                    "detail": (
                        f"Earlier visit noted {row.get('chief_complaint')} "
                        f"(duration: {row.get('duration') or 'unknown'}). "
                        "May be related to today's complaint."
                    ),
                    "prior_intake_id": prior_id,
                    "prior_date": prior_date,
                }
            )
        prior_meds = row.get("medications")
        if prior_meds and prior_meds not in ("unknown", "none", None, []):
            insights.append(
                {
                    "relevance": "medium",
                    "category": "medication",
                    "title": "Prior medications on record",
                    "detail": f"Previously recorded medications: {prior_meds}.",
                    "prior_intake_id": prior_id,
                    "prior_date": prior_date,
                }
            )
        prior_allergy = row.get("allergies")
        if prior_allergy and prior_allergy not in ("unknown", "none", None, ""):
            insights.append(
                {
                    "relevance": "high",
                    "category": "allergy",
                    "title": "Documented allergy from a prior visit",
                    "detail": f"Allergy on file: {prior_allergy}.",
                    "prior_intake_id": prior_id,
                    "prior_date": prior_date,
                }
            )

    # De-duplicate similar titles keeping first (chronologically newest history first)
    seen: set[str] = set()
    unique: list[dict[str, Any]] = []
    for item in insights:
        key = f"{item['category']}:{item['title']}:{item.get('prior_intake_id')}"
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)

    if unique:
        overview = (
            f"Found {len(unique)} historically relevant item(s) linked to patient "
            f"{mask_aadhaar(current.aadhaar_last4)}."
        )
    else:
        overview = "No clearly related prior findings for the current complaint."
    return unique[:8], overview


def analyze_patient_history(
    current_fields: CollectedFields,
    history_rows: list[dict[str, Any]],
) -> dict[str, Any]:
    history = _history_payload(history_rows)
    if not history:
        return {
            "insights": [],
            "overview": "First recorded visit for this Aadhaar — no prior consultations on file.",
            "prior_visit_count": 0,
        }

    stub_insights, stub_overview = _stub_insights(current_fields, history_rows)
    user = json.dumps(
        {
            "current_fields": current_fields.model_dump(),
            "prior_history": history,
        },
        ensure_ascii=False,
    )
    try:
        raw = gateway._complete_with_failover(HISTORY_INSIGHT_PROMPT, user, json_mode=True)  # noqa: SLF001
        text = raw.strip()
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?", "", text).strip()
            text = re.sub(r"```$", "", text).strip()
        data = json.loads(text)
        insights_raw = data.get("insights") or []
        insights: list[dict[str, Any]] = []
        for item in insights_raw:
            try:
                insights.append(HistoricalInsight.model_validate(item).model_dump())
            except Exception:  # noqa: BLE001
                continue
        overview = str(data.get("overview") or stub_overview)
        if not insights:
            insights = stub_insights
            overview = stub_overview
    except Exception as exc:  # noqa: BLE001
        logger.warning("Historical insight analysis failed: %s", exc)
        insights, overview = stub_insights, stub_overview

    return {
        "insights": insights,
        "overview": overview,
        "prior_visit_count": len(history_rows),
    }


def serialize_history_entry(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "intake_id": row.get("id"),
        "created_at": row.get("created_at"),
        "chief_complaint": row.get("chief_complaint"),
        "duration": row.get("duration"),
        "ai_summary": row.get("ai_summary"),
        "consultation_summary": row.get("consultation_summary"),
        "priority_flag": row.get("priority_flag"),
        "status": row.get("status"),
        "symptoms": row.get("symptoms") or [],
        "medications": row.get("medications"),
        "allergies": row.get("allergies"),
        "turn_history": row.get("turn_history") or [],
        "structured_fields": row.get("structured_fields") or {},
    }
