"""Anonymous patient session JWTs + doctor Supabase JWT verification."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from typing import Any, Literal

from fastapi import Depends, Header, HTTPException
from jose import JWTError, jwt

from core.config import settings

Role = Literal["patient", "doctor", "admin"]


def create_patient_token(session_id: str, patient_id: str) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": patient_id,
        "sid": session_id,
        "role": "patient",
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(hours=8)).timestamp()),
    }
    return jwt.encode(payload, settings.session_secret, algorithm="HS256")


def decode_token(token: str) -> dict[str, Any]:
    try:
        return jwt.decode(token, settings.session_secret, algorithms=["HS256"])
    except JWTError:
        if settings.supabase_jwt_secret:
            try:
                return jwt.decode(
                    token,
                    settings.supabase_jwt_secret,
                    algorithms=["HS256"],
                    audience="authenticated",
                    options={"verify_aud": False},
                )
            except JWTError as exc:
                raise HTTPException(status_code=401, detail="Invalid token") from exc
        raise HTTPException(status_code=401, detail="Invalid token") from None


def _bearer(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    return authorization.split(" ", 1)[1]


def get_principal(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    token = _bearer(authorization)
    claims = decode_token(token)
    role = claims.get("role") or (claims.get("app_metadata") or {}).get("role") or "patient"
    claims["role"] = role
    return claims


def require_patient(principal: dict[str, Any] = Depends(get_principal)) -> dict[str, Any]:
    if principal.get("role") != "patient":
        raise HTTPException(status_code=403, detail="Patient token required")
    return principal


def require_staff(principal: dict[str, Any] = Depends(get_principal)) -> dict[str, Any]:
    if principal.get("role") not in ("doctor", "admin"):
        raise HTTPException(status_code=403, detail="Doctor or admin role required")
    return principal


def require_admin(principal: dict[str, Any] = Depends(get_principal)) -> dict[str, Any]:
    if principal.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin role required")
    return principal
