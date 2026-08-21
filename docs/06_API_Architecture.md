# API Architecture

Base URL: `https://<project>.vercel.app/api/v1`
Auth: `Authorization: Bearer <supabase_jwt>` (doctor/admin); patient endpoints use a
short-lived anonymous session token issued at session start.
All responses: JSON. All request/response bodies validated against shared Pydantic/Zod
schemas (`core/schema.py`).

## 1. Session & Language
| Method | Endpoint | Description |
|---|---|---|
| POST | `/session/start` | Creates patient session; returns `session_id`, anonymous token |
| GET | `/languages` | Returns supported languages with tier (1/2/3) and voice/text availability |
| PATCH | `/session/{id}/language` | Sets/updates selected language & dialect hint |

## 2. Conversation
| Method | Endpoint | Description |
|---|---|---|
| POST | `/conversation/{sessionId}/turn` | Body: `{turn_id, input_type: text\|audio, content}` → runs STT (if audio) → LLM extraction → Rule Engine → Question Engine → returns `{ai_message, audio_url?, updated_fields, missing_fields, next_question}` |
| GET | `/conversation/{sessionId}/state` | Returns current collected fields + turn history (for resume) |

## 3. Speech
| Method | Endpoint | Description |
|---|---|---|
| POST | `/speech/transcribe` | Body: audio blob + language → `{text, confidence}` |
| POST | `/speech/synthesize` | Body: text + language → `{audio_url}` |

## 4. Intake Lifecycle
| Method | Endpoint | Description |
|---|---|---|
| GET | `/intake/{sessionId}/summary` | Plain-language recap for patient confirmation |
| POST | `/intake/{sessionId}/confirm` | Patient confirms → intake status `SUBMITTED`, structured JSON persisted |
| GET | `/intake/{id}` | Full structured intake (doctor-facing) |

## 5. Doctor
| Method | Endpoint | Description |
|---|---|---|
| POST | `/doctor/login` | Delegates to Supabase Auth (OTP/email) |
| GET | `/doctor/queue` | List of `SUBMITTED` intakes, sorted by priority + arrival |
| GET | `/doctor/intake/{id}` | Structured summary + flags (missing/contradiction/priority) |
| PATCH | `/doctor/intake/{id}` | Field-level edit; writes `audit_log` entry per changed field |
| POST | `/doctor/intake/{id}/verify` | Sets status `DOCTOR_VERIFIED`; requires all HIGH priority flags acknowledged |

## 6. Admin / Camp
| Method | Endpoint | Description |
|---|---|---|
| POST | `/admin/camp` | Create camp/session batch |
| GET | `/admin/camp/{id}/stats` | Throughput, avg time saved, completeness rate |

## 7. Metrics (pilot validation)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/metrics/asr-sample` | Logs ASR output + optional ground-truth correction for WER tracking |
| GET | `/metrics/summary` | Aggregate: ASR accuracy by language, completeness %, correction rate, avg time saved |

## 8. Standard Error Shape
```json
{
  "error": {
    "code": "SCHEMA_VALIDATION_FAILED",
    "message": "LLM output did not match intake schema; re-prompted.",
    "details": { "field": "duration", "issue": "missing" }
  }
}
```

## 9. Versioning & Contract Stability
- API is versioned via URL prefix (`/v1`); breaking schema changes ship as `/v2` with a
  documented migration window, since patient/doctor apps update asynchronously across
  Web/Android/iOS.
- OpenAPI spec auto-generated from FastAPI, published at `/api/openapi.json`, consumed by
  the frontend to generate a typed API client (single source of truth, prevents drift).
