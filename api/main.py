"""FastAPI entrypoint — 04_Backend_Architecture §1, 06_API_Architecture."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from core.config import settings
from routers import admin, conversation, doctor, intake, metrics, session, speech

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
app.include_router(intake.router, prefix=PREFIX, tags=["intake"])
app.include_router(doctor.router, prefix=PREFIX, tags=["doctor"])
app.include_router(admin.router, prefix=PREFIX, tags=["admin"])
app.include_router(metrics.router, prefix=PREFIX, tags=["metrics"])


@app.exception_handler(Exception)
async def unhandled(_request: Request, exc: Exception) -> JSONResponse:
    from fastapi import HTTPException

    if isinstance(exc, HTTPException):
        detail = exc.detail
        if isinstance(detail, dict) and "error" in detail:
            return JSONResponse(status_code=exc.status_code, content=detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": {"code": "HTTP_ERROR", "message": str(detail), "details": {}}},
        )
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL", "message": "Server error. Your answers are saved.", "details": {}}},
    )


@app.get("/api/v1/health")
def health() -> dict:
    return {"status": "ok"}
