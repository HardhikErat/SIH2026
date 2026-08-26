"""Aadhaar helpers — hash for identity, never persist the full number."""

from __future__ import annotations

import hashlib
import re

from core.config import settings


def normalize_aadhaar(raw: str | None) -> str | None:
    if not raw:
        return None
    digits = re.sub(r"\D", "", str(raw))
    return digits if len(digits) == 12 else None


def validate_aadhaar(raw: str | None) -> str:
    """Return normalized 12-digit Aadhaar or raise ValueError."""
    digits = normalize_aadhaar(raw)
    if not digits:
        raise ValueError("Aadhaar must be exactly 12 digits.")
    return digits


def aadhaar_hash(aadhaar: str) -> str:
    """SHA-256 of salted Aadhaar — unique patient key without storing plaintext."""
    salt = settings.aadhaar_hash_salt or settings.session_secret
    return hashlib.sha256(f"{salt}:{aadhaar}".encode()).hexdigest()


def aadhaar_last4(aadhaar: str) -> str:
    return aadhaar[-4:]


def mask_aadhaar(last4: str | None) -> str:
    if not last4:
        return "XXXX-XXXX-XXXX"
    return f"XXXX-XXXX-{last4}"
