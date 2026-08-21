"""Vercel Python serverless ASGI entry (13_Deployment_DevOps_Architecture)."""

from __future__ import annotations

import os
import sys

# Ensure sibling modules (main, routers, core) resolve on Vercel.
_ROOT = os.path.dirname(os.path.abspath(__file__))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from main import app  # noqa: E402

try:
    from mangum import Mangum  # noqa: E402

    handler = Mangum(app, lifespan="off")
except Exception:  # noqa: BLE001 — fallback if Mangum unavailable
    handler = app

# Vercel also accepts `app` for ASGI deployments.
__all__ = ["app", "handler"]
