"""Extract clinical facts from patient-uploaded documents (PDF / text / images).

Images use Gemini multimodal when a key is configured; otherwise the patient is
asked to type key details. Never invent clinical facts not present in the file.
"""

from __future__ import annotations

import base64
import json
import logging
import re
from typing import Any

from core.config import settings
from core.errors import ApiException
from core.llm_gateway import gateway
from core.schema import CollectedFields, ExtractionDelta

logger = logging.getLogger(__name__)

MAX_DOCUMENT_BYTES = 8 * 1024 * 1024
MAX_TEXT_CHARS = 14_000

ALLOWED_MIME_PREFIXES = (
    "application/pdf",
    "text/",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/heic",
    "application/json",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
)

DOCUMENT_EXTRACT_PROMPT = """You are a clinical intake EXTRACTOR for rural India camps.
A patient uploaded a medical document (lab report, prescription scan text, discharge
summary, etc.). Extract ONLY facts that appear in the document text.

OUTPUT: valid JSON object only. No markdown. No prose outside JSON.
Schema keys (omit unknowns):
- key_facts: string[] — short bullet facts useful for a doctor (max 12)
- patient_note: string — 1-2 sentences acknowledging what was found, in language {language}
- clinical_delta: object matching the intake ExtractionDelta (chief_complaint, duration,
  duration_days, severity, symptoms, medications, allergies, medical_history, fever,
  chest_pain, breathing_difficulty, vomiting, headache, takes_medication, has_allergy, …)

Rules:
1) Never invent. If the document does not state a field, omit it.
2) medications must be a string list of drug names, or "none", or omit.
3) allergies: string or "none" or omit.
4) medical_history: string list of prior conditions / procedures mentioned.
5) Do NOT diagnose, prescribe, or assign urgency/priority.
6) Prefer concept IDs for chief_complaint when clear (SYM_FEVER, SYM_COUGH, …).
7) key_facts must be concrete (e.g. "Hb 9.2 g/dL", "BP 140/90", "taking metformin").
"""


def _guess_mime(filename: str, mime: str | None) -> str:
    if mime and mime != "application/octet-stream":
        return mime.lower().strip()
    name = (filename or "").lower()
    if name.endswith(".pdf"):
        return "application/pdf"
    if name.endswith((".txt", ".csv", ".md", ".log")):
        return "text/plain"
    if name.endswith(".json"):
        return "application/json"
    if name.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    if name.endswith(".png"):
        return "image/png"
    if name.endswith(".webp"):
        return "image/webp"
    if name.endswith(".heic"):
        return "image/heic"
    if name.endswith(".docx"):
        return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    return (mime or "application/octet-stream").lower()


def _mime_allowed(mime: str) -> bool:
    m = mime.lower()
    return any(m == p or m.startswith(p.rstrip("/")) for p in ALLOWED_MIME_PREFIXES) or m.startswith(
        "image/"
    )


def decode_document_bytes(document_base64: str) -> bytes:
    raw = (document_base64 or "").strip()
    if "," in raw and raw.lower().startswith("data:"):
        raw = raw.split(",", 1)[1]
    try:
        data = base64.b64decode(raw, validate=False)
    except Exception as exc:  # noqa: BLE001
        raise ApiException(400, "INVALID_DOCUMENT", "Could not read the uploaded file.") from exc
    if not data:
        raise ApiException(400, "EMPTY_DOCUMENT", "The uploaded file was empty.")
    if len(data) > MAX_DOCUMENT_BYTES:
        raise ApiException(
            413,
            "DOCUMENT_TOO_LARGE",
            "Please upload a file smaller than 8 MB.",
            details={"max_bytes": MAX_DOCUMENT_BYTES},
        )
    return data


def _extract_pdf_text(data: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError as exc:
        raise ApiException(
            503,
            "PDF_UNSUPPORTED",
            "PDF reading is not available on this server. Upload a .txt file or type the details.",
        ) from exc
    from io import BytesIO

    try:
        reader = PdfReader(BytesIO(data))
        parts: list[str] = []
        for page in reader.pages[:20]:
            parts.append(page.extract_text() or "")
        return "\n".join(parts).strip()
    except Exception as exc:  # noqa: BLE001
        logger.warning("PDF parse failed: %s", exc)
        raise ApiException(
            422,
            "PDF_PARSE_FAILED",
            "Could not read text from that PDF. Try a clearer scan or type the key details.",
        ) from exc


def _extract_plain_text(data: bytes) -> str:
    for enc in ("utf-8", "utf-16", "latin-1"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", errors="replace")


def _gemini_image_text(data: bytes, mime: str, language: str) -> str:
    if not settings.gemini_api_key:
        raise ApiException(
            422,
            "IMAGE_OCR_UNAVAILABLE",
            "Image reading needs the vision service. Please upload a PDF/text file or type the important details.",
        )
    import httpx

    prompt = (
        "Extract all readable medical information from this document image for a clinic intake. "
        "Return plain text only: patient identifiers if present, vitals, lab values, diagnoses "
        "listed on the page, medicines, allergies, dates. Do not invent. "
        f"Patient language preference code: {language}."
    )
    with httpx.Client(timeout=60) as client:
        r = client.post(
            f"https://generativelanguage.googleapis.com/v1beta/models/{settings.gemini_model}:generateContent",
            params={"key": settings.gemini_api_key},
            json={
                "contents": [
                    {
                        "role": "user",
                        "parts": [
                            {"text": prompt},
                            {
                                "inline_data": {
                                    "mime_type": mime if mime.startswith("image/") else "image/jpeg",
                                    "data": base64.b64encode(data).decode("ascii"),
                                }
                            },
                        ],
                    }
                ],
                "generationConfig": {"temperature": 0},
            },
        )
        r.raise_for_status()
        parts = r.json()["candidates"][0]["content"]["parts"]
        return "".join(p.get("text", "") for p in parts).strip()


def extract_document_text(
    *,
    filename: str,
    mime_type: str | None,
    document_base64: str,
    language: str = "en",
) -> dict[str, Any]:
    """Return {filename, mime_type, text, char_count, truncated}."""
    mime = _guess_mime(filename, mime_type)
    if not _mime_allowed(mime):
        raise ApiException(
            415,
            "UNSUPPORTED_DOCUMENT_TYPE",
            "Please upload a PDF, text file, or image (JPG/PNG/WebP).",
            details={"mime_type": mime},
        )
    data = decode_document_bytes(document_base64)

    if mime == "application/pdf" or (filename or "").lower().endswith(".pdf"):
        text = _extract_pdf_text(data)
    elif mime.startswith("image/"):
        text = _gemini_image_text(data, mime, language)
    elif "wordprocessingml" in mime or (filename or "").lower().endswith(".docx"):
        raise ApiException(
            415,
            "DOCX_UNSUPPORTED",
            "Word .docx is not supported yet. Please export as PDF or plain text.",
        )
    else:
        text = _extract_plain_text(data)

    text = re.sub(r"[ \t]+\n", "\n", text or "")
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if not text:
        raise ApiException(
            422,
            "NO_TEXT_IN_DOCUMENT",
            "No readable text was found. Try a clearer PDF/photo, or type the key details.",
        )

    truncated = False
    if len(text) > MAX_TEXT_CHARS:
        text = text[:MAX_TEXT_CHARS]
        truncated = True

    return {
        "filename": filename or "document",
        "mime_type": mime,
        "text": text,
        "char_count": len(text),
        "truncated": truncated,
    }


def _stub_document_extract(text: str, language: str) -> dict[str, Any]:
    """Offline/demo path when only the keyword stub LLM is available."""
    lower = text.casefold()
    delta: dict[str, Any] = {}
    facts: list[str] = []

    if any(w in lower for w in ("fever", "bukhar", "बुखार", "ताप")):
        delta.update({"chief_complaint": "SYM_FEVER", "complaint_category": "fever", "fever": "true"})
        facts.append("Document mentions fever")
    if any(w in lower for w in ("cough", "khansi", "खांसी")):
        delta.setdefault("symptoms", []).append({"concept_id": "SYM_COUGH", "raw_term": "cough"})
        facts.append("Document mentions cough")
    if any(w in lower for w in ("diabetes", "sugar", "मधुमेह", "metformin")):
        delta.setdefault("medical_history", [])
        if isinstance(delta["medical_history"], list):
            delta["medical_history"].append("Diabetes")
        facts.append("History of diabetes noted")
    meds: list[str] = []
    for drug in ("paracetamol", "dolo", "crocin", "metformin", "amlodipine", "aspirin"):
        if drug in lower:
            meds.append(drug.title() if drug != "dolo" else "Dolo")
    if meds:
        delta["medications"] = meds
        delta["takes_medication"] = "true"
        facts.append("Medicines: " + ", ".join(meds))
    if "allerg" in lower and any(w in lower for w in ("none", "nil", "no known", "nkda")):
        delta["allergies"] = "none"
        delta["has_allergy"] = "false"
        facts.append("No known allergies stated")

    # Capture simple lab lines like "Hb 9.2" / "BP 120/80"
    for m in re.finditer(r"\b(hb|hemoglobin|bp|spo2|sugar|glucose)\s*[:=]?\s*([\d./]+)\s*([a-zA-Z/%]*)", text, re.I):
        label = m.group(1)
        val = m.group(2)
        unit = (m.group(3) or "").strip()
        facts.append(f"{label.upper()} {val}{(' ' + unit) if unit else ''}".strip())

    if not facts:
        # Keep a short excerpt so the doctor still sees something
        snippet = re.sub(r"\s+", " ", text)[:180].strip()
        if snippet:
            facts.append(snippet + ("…" if len(text) > 180 else ""))

    lang = (language or "en").split("-")[0].lower()
    notes = {
        "en": "I read your document and noted the important details. I may still ask a few questions.",
        "hi": "मैंने आपका दस्तावेज़ पढ़ लिया और ज़रूरी बातें नोट कर लीं। कुछ सवाल और पूछ सकता हूँ।",
        "mr": "मी तुमचा दस्तऐवज वाचला आणि महत्त्वाच्या गोष्टी नोंदवल्या. काही प्रश्न अजून विचारू शकतो.",
    }
    return {
        "key_facts": facts[:12],
        "patient_note": notes.get(lang, notes["en"]),
        "clinical_delta": delta,
    }


def extract_clinical_from_document(
    text: str,
    collected: CollectedFields,
    language: str,
) -> dict[str, Any]:
    """LLM (or stub) → {key_facts, patient_note, clinical_delta: ExtractionDelta dict}."""
    if not gateway.live:
        return _stub_document_extract(text, language)

    system = DOCUMENT_EXTRACT_PROMPT.format(language=language)
    user = json.dumps(
        {
            "language": language,
            "collected_fields": collected.model_dump(),
            "document_text": text,
        },
        ensure_ascii=False,
    )
    try:
        raw = gateway._complete_with_failover(system, user, json_mode=True)  # noqa: SLF001
        from core.llm_gateway import _extract_json

        data = _extract_json(raw)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Document LLM extract failed, using stub: %s", exc)
        return _stub_document_extract(text, language)

    delta_raw = data.get("clinical_delta") if isinstance(data.get("clinical_delta"), dict) else {}
    # Allow flat schema too
    if not delta_raw:
        delta_raw = {
            k: v
            for k, v in data.items()
            if k
            not in (
                "key_facts",
                "patient_note",
                "clinical_delta",
                "document_text",
                "priority_flag",
                "diagnosis",
            )
        }
    try:
        delta = ExtractionDelta.model_validate(delta_raw).model_dump(exclude_none=True)
    except Exception:
        delta = {}

    facts = data.get("key_facts") if isinstance(data.get("key_facts"), list) else []
    facts = [str(f).strip() for f in facts if str(f).strip()][:12]
    note = str(data.get("patient_note") or "").strip()
    if not note:
        note = _stub_document_extract(text, language)["patient_note"]
    if not facts:
        facts = _stub_document_extract(text, language)["key_facts"]

    return {"key_facts": facts, "patient_note": note, "clinical_delta": delta}


def build_document_utterance(filename: str, key_facts: list[str], excerpt: str) -> str:
    """Synthetic patient utterance so the rest of the turn pipeline stays unchanged."""
    lines = [f"[Uploaded document: {filename}]"]
    if key_facts:
        lines.append("Important information from document:")
        lines.extend(f"- {f}" for f in key_facts[:12])
    elif excerpt:
        lines.append(excerpt[:500])
    return "\n".join(lines)
