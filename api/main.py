"""FastAPI entrypoint — 04_Backend_Architecture §1, 06_API_Architecture."""

from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from core.config import settings
from routers import admin, conversation, doctor, intake, metrics, session, speech, translation

logger = logging.getLogger("api")

app = FastAPI(
    title="Multilingual AI Pre-Consultation API",
    version="1.0.0",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PREFIX = "/api/v1"
app.include_router(session.router, prefix=PREFIX, tags=["session"])
app.include_router(conversation.router, prefix=PREFIX, tags=["conversation"])
app.include_router(speech.router, prefix=PREFIX, tags=["speech"])
app.include_router(translation.router, prefix=PREFIX, tags=["translation"])
app.include_router(intake.router, prefix=PREFIX, tags=["intake"])
app.include_router(doctor.router, prefix=PREFIX, tags=["doctor"])
app.include_router(admin.router, prefix=PREFIX, tags=["admin"])
app.include_router(metrics.router, prefix=PREFIX, tags=["metrics"])


def _http_error_payload(exc: StarletteHTTPException) -> dict:
    detail = exc.detail
    if isinstance(detail, dict) and "error" in detail:
        return detail
    return {"error": {"code": "HTTP_ERROR", "message": str(detail), "details": {}}}


@app.exception_handler(StarletteHTTPException)
@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(status_code=exc.status_code, content=_http_error_payload(exc))


@app.exception_handler(Exception)
async def unhandled(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled server error")
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL",
                "message": "Server error. Your answers are saved.",
                "details": {"reason": str(exc)[:400]},
            }
        },
    )


@app.get("/api/v1/health")
def health() -> dict:
    return {"status": "ok"}
