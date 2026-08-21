# Product Requirements Document (PRD)
## Multilingual AI Pre-Consultation & Clinical Intake Assistant
**Team:** CrackCoders (SIH26_25) | **Version:** 2.0 | **Status:** Post Round-1 Revision

---

## 1. Problem Statement
Doctors in rural PHCs/CHCs and medical camps (1 doctor : 50–100 patients/day) lose 2–3
minutes per patient re-collecting basic history (complaints, duration, medication, allergies).
India has 22 scheduled languages plus hundreds of dialects; low literacy makes text-heavy
intake forms unusable. Result: rushed consultations, inconsistent records, missed
allergy/medication data.

**Round-1 Panel Feedback (incorporated in this revision):**
- Converted (AI-extracted) data must be **validated before reaching any real-time/clinical
  platform** → mandatory Doctor Verification gate before any record is marked "usable."
- Non-diagnostic design, rule-based safety layer, contradiction detection, structured intake
  are the strong points — must remain the core architecture, not be diluted.
- Need **clinical pilot testing** and **quantitative validation** metrics: ASR accuracy, intake
  completeness rate, doctor correction rate, actual time saved per patient.
- Must validate across **Indic languages, dialects, accents, and noisy rural environments** —
  this PRD upgrades scope from 2–3 languages to **all 22 scheduled languages + major
  dialect variants**, with a graceful-degradation strategy for unsupported/low-resource tongues.

## 2. Vision
"AI before the doctor, not instead of the doctor." A multilingual, voice-first layer that
collects, structures, and flags patient information — never diagnoses, never prescribes —
so doctors spend consultation time examining and treating, not re-asking basic questions.

## 3. Goals & Non-Goals
### Goals
1. Multilingual (all 22 scheduled Indian languages + dialect tolerance) voice/text patient intake.
2. Adaptive questioning driven by a Question Engine (not a static form).
3. Structured, schema-validated clinical intake JSON per patient.
4. Missing-information detection (stored as `unknown`, never inferred as "no").
5. Contradiction detection across the full conversation.
6. Rule-based (non-LLM) priority/urgency flagging.
7. Doctor dashboard: queue, structured summary, flags, edit, AI_GENERATED → DOCTOR_VERIFIED workflow with audit trail.
8. Fully cloud-native, zero single-PC dependency: GitHub (source), Supabase (DB/Auth/Storage/Edge Functions), Vercel (web + backend API hosting), EAS/Expo (mobile builds) — all free-tier/open-source-first.
9. One codebase (React Native + Expo) → Web, Android, iOS, iPadOS, tablets.
10. Built-in outcome metrics collection (ASR accuracy, completeness, correction rate, time saved) to satisfy panel's validation ask.

### Non-Goals (explicit scope guardrails, per source discussion doc's "what not to build")
- No diagnosis, prescription, treatment decisions.
- No billing, insurance, pharmacy, appointment scheduling, full EHR/HMS.
- No wearable integration, no medical imaging analysis.
- No doctor authentication against a national registry (out of MVP scope; simple role-based auth only).

## 4. Target Users
| User | Needs |
|---|---|
| Rural/low-literacy patients | Speak naturally in own language/dialect; simple UI; confirm before submit |
| PHC/CHC/camp doctors | Fast structured handoff; flags; edit & verify; not another app to babysit |
| ASHA/health workers | Assist patients with device operation; view queue status |
| Camp organizers/PHC admin | Throughput visibility, session/queue management |

## 5. Key Features (mapped to the 43-point discussion doc, priority given to PPT/Feedback doc)
### Must-Have (MVP)
- Language & dialect selection (voice-detected suggestion + manual override)
- Voice + text patient interaction
- AI adaptive Q&A flow (LLM extraction + Rule/Question Engine control)
- Basic demographics (name, age, gender, preferred language)
- Symptom, duration, severity extraction
- Medical history, medication, allergy capture
- Structured JSON output validated against schema
- Missing-information detection & display
- Doctor dashboard: next-patient queue, structured summary
- Supabase persistence (Patients, Intakes, Flags, Audit)

### Should-Have
- Adaptive follow-up question policy (symptom-specific branching)
- Contradiction detection across turns
- Patient confirmation screen before submit
- Doctor edit + explicit Verify action (AI_GENERATED → DOCTOR_VERIFIED)
- Rule-based priority/urgency flag (red/yellow/green)
- Text-to-speech playback of AI questions
- Coverage across all 22 scheduled languages with regional dialect normalization layer

### Nice-to-Have (Post-MVP / Round-2)
- Offline/low-connectivity mode with local queue + sync
- WhatsApp/SMS patient notification
- QR-based patient re-identification across visits
- Curated clinical knowledge base (RAG) for evidence-linked priority flags
- Camp-level analytics (common complaints, throughput)
- Integration hooks for e-Sanjeevani/ABDM (future)

## 6. Success Metrics (Round-1 mandated validation set)
| Metric | Definition | Target (Pilot) |
|---|---|---|
| ASR accuracy | Word Error Rate per language on real rural audio samples | <20% WER for Tier-1 languages (Hindi/Marathi/English), tracked per language |
| Intake completeness | % of required schema fields filled (non-`unknown`) at submission | >85% |
| Doctor correction rate | % of AI-extracted fields edited by doctor at verification | Tracked, target downward trend release-over-release |
| Time saved per patient | (Baseline manual history time) − (Doctor review time of AI summary) | 2–3 min/patient (self-reported doctor survey + timestamp logs) |
| Contradiction catch rate | Manually-seeded contradictions correctly flagged in test set | >90% |
| System uptime | Vercel/Supabase availability during camp hours | >99% |

## 7. Constraints
- Fully open-source / free-tier stack (see Platform Architecture doc).
- No PC/local-server dependency — all infra cloud-hosted.
- Must work on low-end Android devices and patchy rural connectivity (offline-tolerant design, deferred to Should-Have but architecture must not block it).
- Non-diagnostic, safety-first: any clinical decision logic must be deterministic/rule-based, never left to the LLM alone.

## 8. Release Plan
| Phase | Scope |
|---|---|
| P0 – Foundation | Repo, Supabase schema, Auth, CI/CD, base Expo app shell |
| P1 – Core Intake | Text-based conversation flow, LLM extraction, schema validation, DB writes |
| P2 – Voice | STT/TTS integration (Hindi/Marathi/English first, expand language matrix) |
| P3 – Safety Layer | Rule Engine (missing-info, contradiction, priority flags), Question Engine |
| P4 – Doctor Experience | Dashboard, queue, edit/verify workflow, audit trail |
| P5 – Multilingual Expansion | Remaining scheduled languages + dialect normalization dictionary |
| P6 – Validation & Pilot | Metrics instrumentation, synthetic + role-played test corpus, clinical pilot readiness |
| P7 – Hardening | Offline mode, accessibility pass, load test, cross-platform QA (Web/Android/iOS) |
