# Safety & Security Architecture

## 1. Clinical Safety Principles (non-negotiable, from source docs + Round-1 feedback)
1. **AI never diagnoses, prescribes, or makes treatment decisions.** It only collects,
   structures, flags, and summarizes.
2. **No converted/AI-extracted data is treated as usable/clinical until a doctor explicitly
   verifies it.** Enforced structurally: only `POST /doctor/intake/{id}/verify` can set
   status `DOCTOR_VERIFIED`; no other code path does.
3. **Priority/urgency flags are computed by a deterministic Rule Engine, never by the LLM.**
   Rules are version-controlled, unit-tested, and reviewable independent of any LLM
   provider change.
4. **Missing information is stored as `unknown`, never silently defaulted.** Schema-level
   constraint, not just UI convention.
5. **Contradictions are flagged, never auto-resolved.** The system presents both
   statements with turn references; only the doctor decides which is correct.
6. **Every AI→doctor field transition is audit-logged** (immutable `audit_log`), giving a
   full before/after/who/when trail for clinical accountability.

## 2. Data Privacy & Security
- **Transport:** TLS 1.2+ everywhere (Vercel, Supabase enforce this by default).
- **Row Level Security:** patient data readable/writable only within its own session scope
  (anonymous token) or by the assigned camp's authenticated doctor/admin.
- **Consent:** explicit consent screen before any audio is stored (for ASR QA), with a
  clear opt-out that still allows intake to proceed (voice processed transiently, not
  retained, if patient declines storage).
- **Data minimization:** only clinically relevant structured fields persisted long-term;
  raw audio retention is time-boxed and consent-gated, deletable on request.
- **Secrets management:** all API keys (LLM, Bhashini, Supabase service role) stored in
  Vercel/GitHub Actions encrypted secrets — never in the repo or client bundle.
- **Auth:** Supabase Auth (JWT) for doctor/admin roles; patient flow uses short-lived
  anonymous session tokens scoped to a single session ID, no patient login required
  (reduces friction and PII exposure).
- **Forward compatibility:** design aligns directionally with India's DPDP Act 2023
  (consent, purpose limitation, data minimization) and leaves room for future ABDM/health-ID
  integration without a redesign, though neither is a hard MVP requirement.

## 3. AI-Specific Safeguards
- **Schema-constrained output:** every LLM response validated against a strict Pydantic/JSON
  schema before being trusted; invalid output triggers a bounded re-prompt, never silent
  storage of malformed data.
- **Prompt scoping:** system prompt explicitly instructs the LLM it is a documentation
  assistant, must not diagnose or recommend treatment, and must express uncertainty rather
  than fabricate values.
- **Guardrail testing:** adversarial test suite (e.g., patient describing severe symptoms)
  verifies the LLM never outputs a diagnosis/prescription string; if it does, a
  post-processing filter strips/blocks such content before it reaches the doctor UI.
- **Human-in-the-loop by design:** UI never presents AI output as "the diagnosis" — always
  labeled "AI-generated, pending verification" until the doctor acts.

## 4. Operational Resilience
- Idempotent conversation-turn endpoint (client-supplied `turn_id`) to tolerate rural
  network retries without duplicate/corrupted state.
- Session state persisted server-side (Postgres), so a dropped connection doesn't lose
  progress — client resumes via `GET /conversation/{id}/state`.
- Rate-limiting on public endpoints (Vercel Edge/WAF or simple middleware) to protect
  free-tier LLM/ASR quotas from abuse.

## 5. Incident/Audit Readiness
- `audit_log` provides a full accountability trail for any clinical data dispute.
- Structured logging (Sentry + Supabase logs) for rapid root-cause on ASR/LLM failures
  during a live camp — critical given the zero-tolerance-for-silent-failure requirement in
  a healthcare context.
