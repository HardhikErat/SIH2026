from __future__ import annotations

import difflib

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from auth.supabase_auth import require_staff
from db.supabase_client import get_store

router = APIRouter()


class AsrSampleBody(BaseModel):
    language: str
    predicted_text: str
    corrected_text: str | None = None
    session_id: str | None = None


def _wer(ref: str, hyp: str) -> float:
    ref_t = ref.split()
    hyp_t = hyp.split()
    if not ref_t:
        return 0.0 if not hyp_t else 1.0
    sm = difflib.SequenceMatcher(a=ref_t, b=hyp_t)
    matches = sum(tri.size for tri in sm.get_matching_blocks())
    errors = max(len(ref_t), len(hyp_t)) - matches
    return round(errors / len(ref_t), 4)


@router.post("/metrics/asr-sample")
def asr_sample(body: AsrSampleBody, principal: dict = Depends(require_staff)) -> dict:
    store = get_store()
    wer = None
    if body.corrected_text is not None:
        wer = _wer(body.corrected_text, body.predicted_text)
    row = store.add_asr_sample(
        {
            "language": body.language,
            "predicted_text": body.predicted_text,
            "corrected_text": body.corrected_text,
            "wer": wer,
            "session_id": body.session_id,
        }
    )
    return row


@router.get("/metrics/summary")
def metrics_summary(principal: dict = Depends(require_staff)) -> dict:
    store = get_store()
    return store.metrics_summary()
