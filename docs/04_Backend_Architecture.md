# Backend Architecture

## 1. Service Layout
Backend is a single **FastAPI** application, deployed as serverless functions on Vercel
(each router group maps to a Vercel Function bundle) plus optional Supabase Edge
Functions for latency-sensitive lightweight tasks (e.g., simple lookups).

```
/api
 ├─ main.py                 # FastAPI app entrypoint
 ├─ routers/
 │   ├─ session.py          # start/resume patient intake session
 │   ├─ conversation.py     # turn-by-turn message handling
 │   ├─ speech.py           # STT/TTS proxy endpoints
 │   ├─ intake.py           # submit/confirm structured intake
 │   ├─ doctor.py           # queue, summary, edit, verify
 │   ├─ admin.py            # camp/session management
 │   └─ metrics.py          # ASR accuracy, completeness, correction-rate logging
 ├─ core/
 │   ├─ llm_gateway.py       # provider-agnostic LLM client + JSON-schema enforcement
 │   ├─ speech_gateway.py    # IndicWhisper / Bhashini abstraction
 │   ├─ rule_engine.py       # missing-info, contradiction, priority rules (deterministic)
 │   ├─ question_engine.py   # adaptive next-question policy
 │   ├─ normalization.py     # canonical clinical concept + synonym/dialect mapping
 │   └─ schema.py            # Pydantic models = single source of truth for intake schema
 ├─ db/
 │   ├─ supabase_client.py
 │   └─ repositories/        # typed data-access layer per table
 ├─ auth/
 │   └─ supabase_auth.py     # JWT verification middleware (doctor/admin roles)
 └─ tests/
```

## 2. Core Backend Modules

### 2.1 Session Orchestrator (`session.py`, `conversation.py`)
- Creates a `session` row per patient visit; holds current conversation state
  (`collected_fields`, `pending_questions`, `turn_history`) in Postgres — **not** in-memory —
  so any serverless instance can resume it (stateless compute requirement).
- Each turn: receives patient utterance (text or transcribed voice) → LLM Gateway extracts
  entities into schema fields → Rule Engine evaluates missing/contradictory data → Question
  Engine picks next question → response returned to client (+ TTS audio URL if voice mode).

### 2.2 LLM Gateway (`llm_gateway.py`)
- Wraps whichever hosted/OSS LLM is configured (env-driven), enforces **JSON-schema
  constrained output** (function-calling or structured-output mode where available; strict
  regex/pydantic validation + automatic re-prompt on failure otherwise).
- Responsibilities: intent understanding, medical entity extraction, summary generation.
- **Explicitly does NOT**: assign priority flags, decide contradictions are "resolved," or
  make any clinical judgment — those are Rule Engine responsibilities only.

### 2.3 Speech Gateway (`speech_gateway.py`)
- Abstracts IndicWhisper (primary, OSS, can be self-hosted or called via a free inference
  endpoint) and Bhashini ASR/TTS (govt, free API) behind one interface:
  `transcribe(audio, language) -> text`, `synthesize(text, language) -> audio_url`.
- Language-tier aware: routes to whichever engine has better coverage for the requested
  language/dialect; falls back to text-input prompt if neither engine supports it.

### 2.4 Normalization Layer (`normalization.py`)
- Maps raw extracted terms to canonical clinical concept IDs using a versioned
  dictionary table (`clinical_concepts`, `concept_synonyms`) in Supabase — editable without
  redeploying code. Example: `bukhar | jvara | kaaychal | fever → SYM_FEVER`.

### 2.5 Rule Engine (`rule_engine.py`) — Safety Critical, Deterministic, No LLM
- **Missing-information detection:** required-field checklist per complaint category;
  unfilled fields flagged, stored as `unknown`, never inferred.
- **Contradiction detection:** compares each new structured fact against prior turns in the
  same session (e.g., `medications: none` earlier vs. `took BP tablet` later) using
  field-level conflict rules; flags for doctor, never auto-resolves.
- **Priority flagging:** static rule table, e.g. `chest_pain AND breathing_difficulty → HIGH`;
  versioned and unit-tested independently of the LLM.

### 2.6 Question Engine (`question_engine.py`)
- Given `collected_fields` + `missing_fields` + `complaint_category`, returns the next best
  question from a curated question bank (per-symptom branching, per source doc §11–12),
  capped at a max question count to keep sessions short.

### 2.7 Doctor Module (`doctor.py`)
- `GET /doctor/queue` — next-patient queue ordered by arrival + priority flag.
- `GET /doctor/intake/{id}` — structured summary + flags + raw transcript reference.
- `PATCH /doctor/intake/{id}` — field-level edits, each write appended to `audit_log`.
- `POST /doctor/intake/{id}/verify` — transitions `status: AI_GENERATED → DOCTOR_VERIFIED`;
  **this is the only path by which an intake becomes usable downstream**, directly
  satisfying the Round-1 feedback ("converted data validated before reaching any real-time
  platform").

### 2.8 Metrics Module (`metrics.py`)
- Logs ASR confidence/WER samples (against spot-checked ground truth), field completeness
  %, per-field doctor-correction counts, and session timing — feeds the Success Metrics
  dashboard required for clinical pilot validation.

## 3. Backend Cross-Cutting Concerns
- **Auth:** Supabase JWT verified via middleware; doctors/admins require role claim; patient
  sessions use anonymous/device-scoped tokens (no PII required to start intake).
- **Validation:** every external boundary (LLM output, client input) validated with
  Pydantic models shared with the DB schema definitions.
- **Idempotency:** conversation turn endpoint accepts a `turn_id` to safely handle client
  retries over flaky rural networks.
- **Observability:** structured JSON logs → Vercel log drains; Sentry for exceptions.
