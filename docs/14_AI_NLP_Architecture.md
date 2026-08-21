# AI / NLP Architecture
## The Core USP: Multilingual Conversational Medical Intake Intelligence

This document specifies the AI/NLP layer in depth — model choices, prompting strategy,
extraction pipeline, adaptive questioning algorithm, contradiction/missing-info detection
logic, normalization, confidence handling, and evaluation methodology. Every other
architecture doc references this one for anything AI-related; this is the source of truth.

---

## 1. AI System Overview
The AI layer has **four distinct responsibilities**, deliberately separated so that only
the parts that *should* be probabilistic are probabilistic:

| Responsibility | Powered by | Deterministic or Probabilistic |
|---|---|---|
| Speech ↔ Text (ASR/TTS) | IndicWhisper / Bhashini | Probabilistic (with confidence scores) |
| Language understanding + medical entity extraction | LLM (JSON-schema constrained) | Probabilistic, schema-bounded |
| Dialect/synonym → canonical concept mapping | LLM (first pass) + curated dictionary (source of truth) | Hybrid |
| Missing-info / contradiction / priority logic | Rule Engine (pure code) | **Deterministic — no LLM** |
| Next-question selection | Question Engine (policy over structured state) | **Deterministic — no LLM** |
| Doctor-facing summary generation | LLM | Probabilistic, template-guided |

This split is the single most important architectural decision in the app: **the LLM is
excellent at understanding language, terrible at being trusted with clinical judgment** —
so it never makes a judgment call. It only converts language into structured data.

---

## 2. LLM Selection & Hosting
- **Primary:** an open-weights instruction-tuned model (e.g., Llama-3.1-8B-Instruct or
  Mistral-7B-Instruct) served via a free/low-cost inference API (Groq free tier, OpenRouter
  free models, or self-hosted via Ollama on a free cloud runner) — keeps the stack fully
  open-source-first per requirement.
- **Fallback:** a second provider configured behind the same `LLMGateway` interface, so a
  rate-limit or outage on one free tier doesn't take the whole app down during a live camp.
- **Why not a bigger/paid model:** for structured extraction + JSON-constrained output
  (not open-ended reasoning), a well-prompted 7–8B model with few-shot examples performs
  reliably; this keeps the app free-tier-sustainable at camp scale (bursty, not
  continuous, load).
- **Model versioning:** the configured model ID/version is logged per session
  (`sessions.model_version`) so extraction quality regressions can be traced to a specific
  model change — important for a clinical-adjacent tool.

---

## 3. Conversation & Extraction Pipeline (per turn)
```
Patient audio/text
   │
   ▼
[1] ASR (if audio) — IndicWhisper/Bhashini → {text, confidence, language}
   │  low confidence? → UI asks patient to repeat/type (no silent guessing)
   ▼
[2] LLM Extraction Call
   - System prompt: role, scope, canonical concept list, JSON schema, few-shot examples
   - User content: raw transcribed/typed text + running `collected_fields` state
   - Output: structured JSON delta (only new/updated fields this turn)
   ▼
[3] Schema Validation (Pydantic)
   - Pass → continue
   - Fail → single automatic re-prompt with the validation error appended
   - Fail again → fall back to a simple deterministic clarifying question, log incident
   ▼
[4] Normalization Layer
   - Map extracted raw terms → canonical concept IDs via concept_synonyms dictionary
   - Unmapped novel term → still stored (as free text) + flagged for dictionary review
     (keeps the system safe even for terms it doesn't yet recognize)
   ▼
[5] Rule Engine (deterministic, see §5)
   - Missing-field check, contradiction check, priority check against updated state
   ▼
[6] Question Engine (deterministic, see §6)
   - Selects next question from question_bank given state + missing fields
   ▼
[7] Response to client
   - AI question text (+ TTS audio) + any flags surfaced immediately to patient
     (e.g., "I didn't catch the duration — how many days?")
```

---

## 4. Prompt Design

### 4.1 System Prompt (extraction call) — structure
1. **Role definition:** "You are a clinical intake documentation assistant. You extract
   structured information from what a patient says. You do NOT diagnose, do NOT suggest
   treatment, do NOT express clinical opinions."
2. **Output contract:** strict JSON matching the shared Pydantic schema (field names,
   types, enums) — model is instructed to emit *only* JSON, no prose.
3. **Uncertainty instruction:** "If information is not stated, do not guess. Omit the
   field or mark it `unknown`. Never infer a negative (e.g., 'no allergies') unless the
   patient explicitly said so."
4. **Canonical concept grounding:** the current relevant subset of `clinical_concepts` +
   known synonyms is injected so the model prefers mapping to canonical IDs
   (`SYM_FEVER`) over free text, improving normalization accuracy at the source.
5. **Few-shot examples:** 4–6 examples covering: direct statement, indirect/dialectal
   statement, multi-symptom statement, contradiction between two turns, and an
   "I don't know" response — tuned per language batch (translated few-shots for
   non-English prompts where the model performs better with native-language examples).
6. **Conversation state injection:** the model receives `collected_fields` so far (not the
   full raw transcript every time, to control token cost) plus the latest patient
   utterance, and returns only the **delta**.

### 4.2 Summary Generation Prompt (doctor-facing)
- Separate, simpler prompt: given the final structured intake JSON, produce a 3–5 sentence
  plain-clinical-language summary ("Patient reports fever x3 days, cough x1 day, mild
  headache. No breathing difficulty reported. Took paracetamol this morning. Allergy
  status not provided.") — explicitly instructed to state facts only, no interpretation,
  no suggested diagnosis.

### 4.3 Patient Confirmation Prompt
- Reuses the structured JSON to generate a plain-language, patient-language recap (short
  sentences, no medical jargon) for the confirmation screen — same underlying data, two
  different renderings (clinical vs. patient-friendly), so the AI is doing translation-of-
  register, not re-interpreting facts.

---

## 5. Rule Engine — the Deterministic Safety Core

### 5.1 Missing-Information Detection
- Each `chief_complaint` category maps to a **required-field checklist**
  (e.g., `fever` → duration, severity, associated symptoms checked, medication-taken
  checked). After each turn, `required_fields - collected_fields = missing_fields`.
- Rendered to both patient ("one more thing...") and doctor (⚠ badges) — never silently
  dropped.

### 5.2 Contradiction Detection — algorithm
```
for each new_fact extracted this turn:
    for each prior_fact in session.turn_history where prior_fact.field == new_fact.field
                                                      or prior_fact.concept conflicts:
        if conflict_rule(prior_fact, new_fact) == TRUE:
            create contradiction record:
                { field, statement_a: prior_fact, statement_b: new_fact,
                  turn_refs: [prior_turn_id, current_turn_id] }
            do NOT auto-resolve; do NOT overwrite prior_fact
```
- `conflict_rule` is a table of explicit field-level comparators (e.g., boolean flip on
  `takes_medication`, mutually exclusive severity values, duration going backwards
  implausibly) — versioned and unit-tested with a fixture set of known contradiction
  patterns (per source doc's example: "no medicines" → later "took my BP tablet").
- Both statements are preserved verbatim (with turn reference) for doctor review — the
  system's job is to *surface* the conflict, not decide who's right.

### 5.3 Priority Flag Rules
- Static, versioned rule table (`priority_rules`), e.g.:
  `chest_pain == true AND breathing_difficulty == true → HIGH`
  `fever_duration > 7 days AND age > 60 → MEDIUM`
- Rules are simple boolean/threshold expressions over **structured fields only** — never
  over raw LLM prose — so they're auditable, testable, and clinician-reviewable/editable
  without touching AI/LLM code at all.

---

## 6. Question Engine — Adaptive Questioning Algorithm
```
input: collected_fields, missing_fields, chief_complaint_category, question_count_so_far

if question_count_so_far >= MAX_QUESTIONS (default 8-10):
    return null  # proceed to confirmation, whatever is collected is collected

candidate_questions = question_bank.filter(complaint_category == chief_complaint_category)
ranked = candidate_questions
    .filter(field NOT IN collected_fields)          # don't re-ask
    .sort_by(priority_order, relevance_to(missing_fields))

return ranked.first() or GENERIC_FOLLOWUP_PROMPT
```
- **Branching example (per source doc):** `chest_pain` complaint category pulls a
  different candidate question set (onset, continuous vs. intermittent, breathing
  difficulty, exertion-related) than `headache` (constant vs. intermittent, fever,
  vomiting, sudden onset) — question bank is data (Supabase table), not hardcoded in the
  LLM prompt, so clinicians can extend/edit it without a redeploy.
- Session-level cap (`MAX_QUESTIONS`) keeps the conversation short per the "don't make this
  a 30-question form" requirement — trades some completeness for patient throughput,
  by design.

---

## 7. Confidence & Uncertainty Handling
- ASR returns a confidence score per utterance; below threshold (~0.6) triggers a
  repeat/type prompt rather than feeding a likely-wrong transcript into extraction.
- LLM extraction is **not** asked to self-report confidence per field (unreliable);
  instead, uncertainty is handled structurally — if a field isn't clearly stated, it's
  simply absent from the JSON delta, which the Rule Engine then correctly reports as
  `missing`, not as a low-confidence guess.
- Every extraction call, its input, output, and validation result are logged
  (`turn_history` jsonb in `sessions`) — full replayability for QA and dispute review.

---

## 8. Evaluation & Continuous Improvement (answers the Round-1 "quantitative validation" ask)
| What's measured | How |
|---|---|
| ASR accuracy (WER) per language/dialect | Spot-check sample of sessions against human-corrected transcript, logged to `asr_samples` |
| Extraction accuracy | Doctor correction rate per field (`audit_log` diff between AI_GENERATED and DOCTOR_VERIFIED values) — the single best real-world proxy for LLM extraction quality |
| Contradiction detection precision/recall | Synthetic + role-played test corpus (per source doc's feasibility note) with seeded contradictions, run as a regression suite on every Rule Engine change |
| Question Engine efficiency | Avg. question count to reach completeness threshold, tracked per complaint category |
| Prompt/model regression | Golden test set of transcripts → expected structured output, run in CI before promoting a new model version to production |

- **No production LLM/prompt change ships without passing the golden regression suite** —
  this is the AI equivalent of the Rule Engine's unit-test discipline, applied to the
  probabilistic layer.

---

## 9. Why This Is the App's Actual USP (summary for stakeholders)
Most competing "medical chatbot" approaches (per the Literature Survey in the PPT — AMIE,
Agentic LLM Intake, generic medical chatbots) either let the LLM freely reason over
clinical decisions or are English-centric, form-based, and non-adaptive. This system's USP
is specifically:
1. **Indic-first, dialect-tolerant conversational extraction** — not a translated English
   chatbot.
2. **Adaptive, symptom-branching questioning** driven by structured data, not a fixed
   form or an unconstrained LLM conversation.
3. **A hard architectural boundary between "AI understands language" and "AI makes
   clinical judgments"** — the latter is always deterministic, rule-based, and
   doctor-gated, which is what makes the product defensible and pilot-ready rather than
   just a demo.
