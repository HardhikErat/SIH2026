# Platform Architecture

## 1. High-Level System Diagram
```
                        ┌───────────────────────────────────────────┐
                        │            GitHub (source of truth)        │
                        │  monorepo: /app (Expo) /api (FastAPI)      │
                        │  /supabase (migrations) /docs               │
                        └───────────┬─────────────────┬──────────────┘
                                    │ push/PR           │ push/PR
                             GitHub Actions        GitHub Actions
                             (Vercel deploy)         (EAS Build)
                                    │                   │
                     ┌──────────────▼───────┐   ┌───────▼──────────────┐
                     │   Vercel (Web + API)  │   │  EAS (Android/iOS)   │
                     │  - Next-hosted RN Web │   │  builds → stores /   │
                     │  - FastAPI serverless │   │  internal testing    │
                     └──────────┬────────────┘   └───────────┬─────────┘
                                │  REST/HTTPS                 │ REST/HTTPS
                                ▼                               ▼
                     ┌──────────────────────────────────────────────┐
                     │                Client Apps                    │
                     │  React Native + Expo — Web / Android / iOS /  │
                     │  iPadOS — /patient and /doctor experiences    │
                     └───────────────────┬────────────────────────────┘
                                          │
                     ┌────────────────────▼─────────────────────────┐
                     │              Backend API (FastAPI)             │
                     │  Session Orchestrator | LLM Gateway |          │
                     │  Rule Engine | Question Engine | Speech Proxy  │
                     └───┬───────────┬───────────┬───────────┬───────┘
                         │           │           │           │
                 ┌───────▼───┐ ┌─────▼─────┐ ┌───▼────────┐ ┌▼─────────────┐
                 │ Supabase   │ │ LLM API    │ │ IndicWhisper│ │ Bhashini     │
                 │ Postgres/  │ │ (hosted,   │ │ / Indic-TTS │ │ ASR/TTS API  │
                 │ Auth/      │ │ swappable) │ │ (OSS, self  │ │ (Govt, free) │
                 │ Storage    │ │            │ │ or hosted   │ │              │
                 └────────────┘ └────────────┘ └─────────────┘ └──────────────┘
```

## 2. Platform Principles
1. **Cloud-only, no single-PC dependency.** GitHub is the only "local" artifact developers touch; everything else deploys automatically from CI.
2. **One codebase, four+ targets.** Expo Router config drives Web (via Expo Web → static/SSR export deployed to Vercel), Android (EAS → APK/AAB), iOS/iPadOS (EAS → IPA).
3. **Stateless compute, stateful data in Supabase.** API layer holds no session state between requests beyond what's persisted in Postgres — enables safe horizontal scaling on serverless.
4. **Provider-agnostic AI Gateway.** LLM, ASR, and TTS providers sit behind thin interfaces so a free/OSS provider can be swapped without touching business logic (protects against rate limits/outages of any single free-tier provider).
5. **Safety logic never lives in the LLM.** Rule Engine and Question Engine are deterministic code paths, independently testable and auditable.

## 3. Environments
| Env | Web (Vercel) | API (Vercel Functions) | DB (Supabase) | Mobile |
|---|---|---|---|---|
| `dev` | Vercel Preview Deploys (per PR) | Preview Functions | Supabase `dev` project | EAS dev builds |
| `staging` | `staging` branch → Vercel staging alias | Staging Functions | Supabase `staging` project | EAS internal distribution |
| `prod` | `main` branch → production domain | Production Functions | Supabase `prod` project | EAS production / store submission |

## 4. CI/CD Pipeline (GitHub Actions)
1. **On PR:** lint (ESLint/Ruff), type-check (TS/mypy), unit tests, Rule Engine coverage gate, Supabase migration dry-run, Vercel preview deploy.
2. **On merge to `main`:** run full test suite → apply Supabase migrations (via `supabase db push` in CI) → deploy API+Web to Vercel production → trigger EAS build (Android/iOS) → smoke test against production API.
3. **Secrets:** stored in GitHub Actions Secrets + Vercel/Supabase project settings; never in repo.

## 5. Multi-Platform Delivery
- **Web:** Vercel production URL, PWA-installable (per source PPT: "React PWA, low-literacy UI"), works on patient tablets/kiosks without app-store installs.
- **Android:** EAS-built APK for sideload during pilot; AAB for Play Store submission later.
- **iOS/iPadOS:** EAS-built IPA, TestFlight distribution for pilot; App Store submission later. iPad layout handled via responsive Expo/NativeWind breakpoints for doctor dashboard (larger screens at PHC front desk).

## 6. Disaster Recovery / Continuity
- Supabase automated daily backups (free tier retains recent backups; upgrade path documented for production).
- Infrastructure-as-code: Supabase migrations versioned in repo (`/supabase/migrations`), fully reproducible in a new Supabase project if needed.
- No developer machine holds unique state — a fresh clone + `vercel link` + `supabase link` fully reconstructs the deployable system.
