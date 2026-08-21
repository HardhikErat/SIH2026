# Technical Requirements Document (TRD)

## 1. Stack Overview (100% cloud, free/open-source first)
| Layer | Technology | Notes |
|---|---|---|
| Client (Web/Android/iOS/iPadOS) | **React Native + Expo (SDK, Expo Router)** | Single codebase, EAS Build for native binaries, Expo Web for browser |
| UI | NativeWind (Tailwind for RN) or Tamagui | Free/OSS |
| State/data | TanStack Query + Zustand | Free/OSS |
| Backend API | **FastAPI (Python)** deployed as **Vercel Serverless (via ASGI) or a free-tier Render/Fly.io service** | Keep stateless; orchestrates LLM, STT/TTS, rules |
| Alt backend hosting | Supabase Edge Functions (Deno/TS) for lightweight endpoints | Avoids any single PC/server dependency |
| Database | **Supabase (managed PostgreSQL)** | Free tier; Row Level Security (RLS) |
| Auth | Supabase Auth (email/OTP for doctors, anonymous/device sessions for patients) | Free |
| File/Audio storage | Supabase Storage | Free tier, stores raw audio for QA/ASR improvement (with consent) |
| Speech-to-Text | **AI4Bharat IndicWhisper (OSS)** primary; **Bhashini ASR API (Govt, free)** fallback/expansion for extra languages/dialects | Both open/free |
| Text-to-Speech | **AI4Bharat Indic-TTS (OSS)**; Bhashini TTS fallback | Free |
| LLM | Hosted LLM via free/low-cost API tier (e.g., an OpenAI-compatible free-tier or self-hosted OSS model such as **Llama-3-8B-Instruct / Mistral via Groq free tier or Ollama on a free cloud runner**) — abstracted behind an LLM Gateway interface so provider is swappable | JSON-schema constrained output; no fine-tuning required |
| Rule/Question Engine | Pure Python/TypeScript deterministic module | No LLM involvement in safety decisions |
| Source control/CI | **GitHub + GitHub Actions** | Free for public/private small repos |
| Web hosting | **Vercel** | Free tier, auto-deploy on push to `main` |
| Mobile builds/distribution | **Expo Application Services (EAS)** free tier + GitHub Actions trigger | Internal distribution / TestFlight / Play Internal Testing |
| Monitoring | Vercel Analytics (free) + Supabase Logs + Sentry free tier | Error tracking |
| Secrets | Vercel Environment Variables + GitHub Actions Secrets + Supabase Vault | Never committed to repo |

**Zero single-machine dependency:** all code lives on GitHub; all builds run on GitHub Actions/EAS cloud runners; all runtime infra is Vercel + Supabase (managed). No developer laptop is required to keep the app running.

## 2. Non-Functional Requirements
- **Availability:** ≥99% during pilot camp hours (Vercel + Supabase SLAs support this on paid tiers; free tier acceptable for hackathon/pilot scale).
- **Latency:** Voice turnaround (speech → structured follow-up question) target <4s on 4G; <8s on 2G/patchy rural network with retry/backoff.
- **Scalability:** Stateless API layer horizontally scalable on Vercel serverless; Supabase Postgres connection pooling via Supavisor.
- **Security/Privacy:** TLS everywhere; RLS on all patient tables; consent capture before storing raw audio; data minimization (only clinically relevant fields persisted); doctor auth required to view PII.
- **Accessibility:** WCAG 2.1 AA for web; large-touch-target, icon+voice-first UI for low-literacy users; TTS for all AI prompts.
- **Offline tolerance:** Client queues intake locally (SQLite/AsyncStorage) and syncs to Supabase when connectivity resumes (Should-Have, architecture allows P7 phase).
- **Portability:** Same Expo codebase builds Web (Vercel), Android (APK/AAB via EAS), iOS/iPadOS (via EAS + Apple provisioning) — no platform-specific rewrites.
- **Compliance direction:** Design consent, minimization, and audit trail to be forward-compatible with India's DPDP Act 2023 and eventual ABDM alignment (not a hard MVP requirement, but architecture shouldn't block it).

## 3. Safety-Critical Technical Requirements (per Round-1 feedback)
1. **No AI-generated field reaches a "usable/verified" state without an explicit doctor action.**
2. All LLM output MUST pass JSON-schema validation before being written to `intakes`; failed validation triggers a re-prompt to the LLM, not silent storage.
3. Priority flags (🔴🟡🟢) are computed **only** by the deterministic Rule Engine reading structured fields — the LLM never sets a priority flag directly.
4. Every AI-generated vs doctor-edited field change is written to an immutable `audit_log` row (who, what, before/after, timestamp).
5. Missing data is stored as the literal value `unknown`/`not_provided` — the schema disallows silently defaulting to negative/false for clinical booleans (e.g., `has_allergy: true | false | "unknown"`).

## 4. Localization / Multilingual Technical Requirements
- Canonical clinical concept dictionary (e.g., `fever` canonical ID `SYM_FEVER`) with synonym maps per language/dialect (`bukhar`, `jvara`, `kaaychal`, ...).
- ASR: IndicWhisper covers all 22 scheduled languages at varying maturity; Bhashini used to fill gaps and for pipeline redundancy.
- Dialect handling: normalization layer (LLM-assisted term mapping + curated synonym dictionary, versioned in DB) sits between ASR output and entity extraction.
- Language coverage tiering documented and surfaced to users: Tier 1 (full voice+text, validated), Tier 2 (voice+text, beta accuracy), Tier 3 (text-first, ASR experimental) — ensures honest scope while still "supporting all Indian languages" per requirement, with transparent quality signaling rather than false completeness claims.

## 5. Testing Requirements
- Unit tests: Rule Engine (missing-info, contradiction, priority) — 100% branch coverage target (safety-critical).
- Contract tests: LLM output → JSON schema (Pydantic/Zod) validation harness with adversarial/malformed-input fixtures.
- Synthetic/role-played conversation corpus (per source doc §Feasibility) across languages for regression testing without real patient data.
- E2E tests: Detox/Playwright across patient flow and doctor flow.
- Load test: k6 against FastAPI endpoints for camp-scale concurrency (50–100 patients/day burst modeling).
