#!/usr/bin/env bash
# Idempotent bootstrap for the Aira monorepo (FastAPI API + Expo app).
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# The default image ships python3.12 but not the stdlib venv/ensurepip module.
if ! python3.12 -c "import ensurepip" >/dev/null 2>&1; then
  sudo apt-get update -y
  sudo apt-get install -y python3.12-venv
fi

# --- API (FastAPI) -------------------------------------------------------
cd "$REPO_ROOT/api"
if [ ! -x .venv/bin/python ]; then
  python3.12 -m venv .venv
fi
.venv/bin/python -m pip install --upgrade pip
.venv/bin/pip install -r requirements-dev.txt

# --- App (Expo / React Native Web) --------------------------------------
cd "$REPO_ROOT/app"
npm ci

echo "Aira environment ready: API deps in api/.venv, app node_modules installed."
