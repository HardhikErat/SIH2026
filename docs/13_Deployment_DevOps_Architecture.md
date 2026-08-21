# Deployment & DevOps Architecture (Cloud-Only, No Single-PC Dependency)

## 1. Repository Structure (GitHub monorepo)
```
/app            - Expo (React Native) app: patient + doctor + admin experiences
/api            - FastAPI backend
/supabase
  /migrations   - versioned SQL schema (patients, sessions, intakes, audit_log, ...)
  /seed         - clinical concepts, synonyms, question bank seed data
/docs           - this document set
/.github/workflows
  ci.yml        - lint/test/typecheck on every PR
  deploy-web-api.yml  - Vercel deploy on merge to main
  deploy-mobile.yml   - EAS build trigger on merge/tag
```

## 2. Why Nothing Depends on a Single PC
- **Source:** GitHub is the only canonical copy of code; any contributor's laptop is
  disposable/replaceable.
- **Build:** GitHub Actions (cloud runners) execute all lint/test/build steps — a
  contributor never needs to run a local production build to ship.
- **Web + API hosting:** Vercel builds and serves directly from the GitHub repo
  (auto-deploy on push); no server to maintain.
- **Mobile builds:** EAS Build runs in Expo's cloud, producing signed APK/AAB/IPA without
  requiring a local macOS machine (even for iOS builds) or local Android SDK.
- **Database:** Supabase is a fully managed cloud Postgres — no self-hosted DB server.
- **Secrets:** stored in GitHub/Vercel/Supabase/EAS project settings, not on any machine.
- Result: the entire team can lose their laptops and rebuild everything from `git clone` +
  cloud service dashboards.

## 3. CI/CD Workflows
### `ci.yml` (on every PR)
1. Checkout → install deps (`pnpm`/`npm`, `pip`)
2. Lint (ESLint, Ruff) + type-check (`tsc`, `mypy`)
3. Unit tests (Rule Engine, Question Engine, schema validation) — coverage gate on
   safety-critical modules
4. Supabase migration dry-run against an ephemeral test DB
5. Vercel Preview Deployment (auto-comment with preview URL on the PR)

### `deploy-web-api.yml` (on push to `main`)
1. Run full test suite
2. Apply Supabase migrations to `staging`, run smoke tests
3. Promote migrations to `prod`
4. Deploy Web + API to Vercel production (`vercel --prod`)
5. Post-deploy smoke test against production API health endpoint

### `deploy-mobile.yml` (on release tag)
1. `eas build --platform android --profile production`
2. `eas build --platform ios --profile production`
3. Optional: `eas submit` to Play Store / TestFlight

## 4. Environments & Config
| Env | Purpose | Trigger |
|---|---|---|
| Preview | Per-PR review | Every PR |
| Staging | Pre-release validation, pilot dry-runs | Merge to `main` (auto) |
| Production | Live camp deployment | Manual promote / tag |

All environment-specific values (Supabase URL/keys, LLM API keys, Bhashini keys) injected
via env vars per environment — never hardcoded.

## 5. Cost/Free-Tier Discipline
- Vercel Hobby tier: sufficient for pilot-scale traffic (single camp concurrency).
- Supabase Free tier: sufficient for pilot data volume; documented upgrade path (Pro tier)
  before larger multi-camp rollout.
- EAS free tier build allowance: sufficient for periodic release builds during
  development/pilot.
- AI4Bharat models + Bhashini APIs: free/open, avoiding recurring paid ASR/TTS/LLM vendor
  lock-in; LLM Gateway abstraction allows swapping to another free/OSS provider if quota
  limits are hit.

## 6. Monitoring & Rollback
- Vercel instant rollback to any previous deployment (one click / one CLI command).
- Supabase migrations are additive-first (avoid destructive changes without a
  backward-compatible transition window) to keep rollback safe.
- Sentry alerts on backend exceptions; Vercel Analytics for traffic/error-rate visibility.
