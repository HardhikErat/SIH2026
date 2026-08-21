from __future__ import annotations

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from auth.supabase_auth import require_staff
from core.errors import ApiException
from db.supabase_client import get_store

router = APIRouter()


class CampBody(BaseModel):
    name: str
    location: str
    organizer: str
    start_date: str
    end_date: str


@router.post("/admin/camp")
def create_camp(body: CampBody, principal: dict = Depends(require_staff)) -> dict:
    store = get_store()
    camp = store.create_camp(body.name, body.location, body.organizer, body.start_date, body.end_date)
    return camp


@router.get("/admin/camp/{camp_id}/stats")
def camp_stats(camp_id: str, principal: dict = Depends(require_staff)) -> dict:
    store = get_store()
    camp = store.get_camp(camp_id)
    if not camp:
        raise ApiException(404, "CAMP_NOT_FOUND", "Camp does not exist.")
    summary = store.metrics_summary()
    queue = store.list_queue(camp_id)
    return {
        "camp": camp,
        "waiting": len(queue),
        "completeness_pct_avg": summary.get("completeness_pct_avg"),
        "avg_session_seconds": summary.get("avg_session_seconds"),
        "intakes_submitted": summary.get("intakes_submitted"),
        "intakes_verified": summary.get("intakes_verified"),
    }
