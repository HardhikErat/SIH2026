# Multilingual AI Pre-Consultation & Clinical Intake Assistant

Monorepo for CrackCoders (SIH26_25). See `/docs` for the binding specification.

## Structure

- `app/` — Expo Router client (Web / Android / iOS / iPadOS)
- `api/` — FastAPI backend (LLM Gateway, Rule Engine, Question Engine)
- `supabase/` — Postgres migrations + seed data
- `.github/workflows/` — CI/CD

## Local development

### API (memory store — no Supabase required)

```powershell
cd api
py -3.11 -m pip install -r requirements-dev.txt
py -3.11 -m uvicorn main:app --reload --port 8000
```

Health: http://localhost:8000/api/v1/health

### Expo app

```powershell
cd app
$env:EXPO_PUBLIC_API_URL="http://localhost:8000/api/v1"
npm start
```

Demo doctor login: `doctor@camp.local` / `camp-demo`

### Intake robot (hero visor)

Reusable Expo component: `app/shared/components/RobotEyes.tsx`.

The mascot lives in the landing hero (not a separate page). Eye coordinates are the tuned SVG values on a **900×1000** canvas (do not recalculate): left pupil `(423, 285)`, right pupil `(642, 280)`, max travel **20**.

```powershell
cd app
npx expo install react-native-svg
npm start
```

Open the landing page and move the pointer across the robot visor.

### Playwright MCP (Cursor)

This repo ships `.cursor/mcp.json` so Cursor can attach the official Playwright MCP server (`@playwright/mcp`). After pulling this branch, reload MCP in Cursor Settings → MCP if the Playwright tools do not appear.

## Safety architecture

- Priority flags, missing-info, and contradictions are **Rule Engine only** (see `api/core/rule_engine.py`).
- Only `POST /doctor/intake/{id}/verify` sets `DOCTOR_VERIFIED`.
- Missing clinical data is stored as `unknown`, never inferred false.

## Deploy

### Supabase (linked)
- **Project:** `sih-pre-consultation` (`qkprwuvpwdggruzdrpyl`)
- **URL:** https://qkprwuvpwdggruzdrpyl.supabase.co
- Schema + seed applied via MCP migration `sih2026_full_schema_reset`

Copy **service_role** and **JWT secret** from [Supabase Dashboard → Settings → API](https://supabase.com/dashboard/project/qkprwuvpwdggruzdrpyl/settings/api) into `.env`.

### One-command release
```powershell
# 1. Copy template and fill Supabase secrets
Copy-Item .env.local.template .env
# edit .env → SUPABASE_SERVICE_ROLE_KEY, SUPABASE_JWT_SECRET

# 2. Push to GitHub + deploy Vercel
.\scripts\release.ps1

# Or separately:
.\scripts\push-to-github.ps1
.\scripts\deploy-to-vercel.ps1        # preview
.\scripts\deploy-to-vercel.ps1 -Prod  # production
```

- Web + API: Vercel (`vercel.json`)
- Database: Supabase migrations in `supabase/migrations`
- Mobile: EAS (`app/eas.json`)
- GitHub: https://github.com/HardhikErat/SIH2026

Set env vars from `.env.local.template` in Vercel / Supabase / GitHub Actions secrets.
