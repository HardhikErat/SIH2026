# App Flow

## 1. End-to-End Flow
```
Patient arrives at camp/PHC
  → Device (kiosk tablet / own phone via PWA link)
  → Language & dialect selection (icon + audio prompt, no reading required)
  → AI greets in selected language, explains purpose (voice+text)
  → Patient describes problem (voice or text)
     → ASR (if voice) → LLM extraction → Normalization → Rule Engine check
     → Question Engine selects next best question (adaptive, symptom-branching)
     → repeat until required fields complete or max-question cap reached
  → Patient Confirmation screen: plain-language recap, Yes/Go-Back
  → Intake marked SUBMITTED, structured JSON persisted (status = AI_GENERATED)
  → Doctor Dashboard: patient appears in queue, sorted by priority flag + arrival
  → Doctor clicks "Next Patient" → sees structured summary, flags, missing-info badges
  → Doctor may edit fields (each edit audit-logged) → clicks "Verify & Save"
  → Status → DOCTOR_VERIFIED (only now is data considered clinically usable)
  → Doctor proceeds with in-person examination, informed by verified summary
```

## 2. Patient-Side Screen Flow
1. **Entry / Language Select** — icon grid of languages (Hindi, Marathi, English shown
   first as Tier-1, others accessible via "More languages" list), mic-first CTA.
2. **Conversation Screen** — chat-style turns; big mic button; live transcription shown as
   text (helps hearing-impaired/quiet patients); TTS auto-plays each AI question.
3. **Adaptive Follow-ups** — screen doesn't change structurally; question content adapts
   based on Question Engine output (e.g., chest pain → breathing difficulty follow-up).
4. **Confirmation Screen** — bullet recap in plain language + patient's own language;
   [Yes, Submit] / [Go Back and Correct].
5. **Done Screen** — "Please wait, the doctor will call you" + queue position indicator.

## 3. Doctor-Side Screen Flow
1. **Login** (Supabase Auth OTP/email).
2. **Queue Screen** — card per waiting patient: name/ID, priority color, wait time,
   "View" action.
3. **Patient Detail Screen** — grouped structured summary (Complaint / Symptoms / History /
   Medications / Allergies), missing-info badges (⚠), contradiction warnings (⚠),
   priority banner (🔴/🟡/🟢), inline edit affordance per field.
4. **Verify Action** — "Verify & Save" button; if HIGH priority flag present and
   unacknowledged, a confirm-dialog requires explicit doctor acknowledgment before saving.
5. **Next Patient** — returns to queue.

## 4. Admin Flow (lightweight, MVP-minimal)
1. Create camp (name, location, dates).
2. Monitor live stats: patients intake-completed vs. seen, avg completeness, avg time
   saved.

## 5. Error & Edge-Case Flows
- **ASR low confidence / unsupported dialect:** system auto-suggests switching to text
  input for that turn, without blocking the conversation.
- **Network drop mid-session:** client caches turns locally, retries on reconnect using
  idempotent `turn_id`; session resumable via `GET /conversation/{id}/state`.
- **LLM schema-validation failure:** backend auto re-prompts the LLM once with the
  validation error; on repeated failure, falls back to asking the patient a simpler,
  directly-mapped question (graceful degradation, never silently stores malformed data).
- **Patient abandons session:** session status `ABANDONED` after timeout; not shown in
  doctor queue.
