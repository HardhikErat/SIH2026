# Design Principles — UI/UX Rules
## Multilingual AI Pre-Consultation & Clinical Intake Assistant

This document defines the visual identity and interaction rules for the whole app. It
exists because "make it look nice" isn't a spec — every rule below is derived from the
actual constraint this product faces: **low-literacy, multilingual patients under
consultation-queue time pressure, and doctors who need to trust and act on the AI's output
in seconds.** Nothing here is decorative; every choice should be traceable to that brief.

---

## 0. Design Thesis
This is not a consumer health app and not a hospital SaaS dashboard. It is a **calm
clinical intake instrument** — closer in spirit to a well-designed medical device
interface than to a chat app. The patient side should feel like *being listened to*, not
*filling a form*. The doctor side should feel like a **trusted second opinion on
paperwork**, not another system to fight.

**Signature element:** the **AI_GENERATED → DOCTOR_VERIFIED state transition** is made
visually explicit everywhere it appears (a soft "pending" treatment that resolves to a
solid, confirmed treatment on verify) — this is the one interaction motif the whole app is
built around, because it *is* the product's safety promise made visible.

---

## 1. Token System

### 1.1 Color
| Token | Hex | Use |
|---|---|---|
| `--color-surface` | `#FBF9F6` | App background — warm off-white, not clinical stark white (reduces glare on rural outdoor-lit tablets), not cream-beige-default (see note below) |
| `--color-surface-alt` | `#F1EFE9` | Card/section backgrounds |
| `--color-ink` | `#1E2422` | Primary text — near-black, warmer than pure black for long reading comfort |
| `--color-ink-muted` | `#5B655F` | Secondary text, captions |
| `--color-primary` | `#1F6E5C` | Deep teal-green — trust, medical-adjacent without being sterile-hospital-blue; used for primary actions and the AI's "voice" (chat bubbles, mic button) |
| `--color-primary-deep` | `#134A3E` | Pressed/active states |
| `--color-accent` | `#D98F4E` | Warm amber — used sparingly for the *single* signature moment: verification-pending → verified transition, and for TTS "listen" affordances |
| `--flag-high` | `#C4453D` | Priority: urgent |
| `--flag-medium` | `#D9A63E` | Priority: moderate / missing-info warning |
| `--flag-low` | `#3E8F63` | Priority: routine / verified-good |
| `--color-border` | `#DEDACF` | Hairline dividers |

*Note on avoiding generic AI-design tells:* we deliberately do **not** use a terracotta/clay
accent near `#D97757` (a recognizable default), nor a stark near-black background with a
single neon accent. The palette instead comes from the subject itself: teal-green reads as
"clinical + calm" without being sterile hospital-blue, and the warm off-white ground suits
outdoor/tablet use in camp settings — both are choices made for *this* brief, not a
template default.

### 1.2 Typography
| Role | Typeface | Notes |
|---|---|---|
| Display / headings | **Fraunces** (variable, restrained weight range) | Used only for screen titles and the doctor summary headline — a serif with warmth, not a generic geometric sans, gives the product a "considered document" feel appropriate to a clinical record, used sparingly (2–3 instances per screen max) |
| Body / UI | **Inter** | Neutral, extremely legible at small sizes across scripts (has broad Latin coverage; paired with script-specific fallbacks below) |
| Indic scripts | **Noto Sans [Devanagari/Bengali/Tamil/Telugu/...]** family, matched per active language | Open-source, comprehensive script coverage, consistent x-height pairing with Inter |
| Numerals/data | **Inter Tabular** (feature `tnum`) | Used for durations, ages, timestamps — keeps doctor dashboard numbers aligned |

Type scale (mobile base, scales up for tablet/web):
`12 / 14 / 16 / 18 / 22 / 28 / 36` — body text never below **16px**; this is a hard floor,
not a default, because of the low-literacy/readability requirement.

### 1.3 Spacing & Shape
- Spacing scale: `4 · 8 · 12 · 16 · 24 · 32 · 48`.
- Corner radius: `12px` standard (cards, buttons), `24px` for the mic button (the one
  circular, high-affordance element on the patient screen — deliberately the roundest
  thing on screen so it reads as "press me").
- Elevation: flat design with a single soft shadow tier (`0 2px 8px rgba(30,36,34,0.06)`)
  for cards — no heavy skeuomorphism, no glassmorphism (adds visual noise for low-literacy
  users).

---

## 2. Core UX Principles

### 2.1 Speak before you write
Every AI prompt is voice-first. Text is the fallback, not the default. On the patient
side, the mic button is always the largest, highest-contrast interactive element on
screen; text input is present but visually secondary (smaller, lower on the screen).

### 2.2 Never make the patient read to proceed
No screen requires reading more than two short sentences before an action is available.
Language selection uses script/flag icons + audio preview, not just a text list. Every
AI question has a paired TTS playback control, auto-played by default.

### 2.3 Show understanding, don't assume it
After every few turns, the AI's current understanding is visible (even mid-conversation,
not just at final confirmation) — e.g. small inline chips ("Fever · 3 days") appear as
facts are captured. This gives patients continuous, low-effort confidence the system is
listening correctly, rather than a black box they must trust blindly until the end.

### 2.4 Absence is honest, not hidden
Missing fields are never blank-and-invisible. A "not yet answered" state is always
visually distinct from "answered as no/none" — amber outline + explicit label
("Not answered yet") vs. a filled, confirmed field. This is a direct UI expression of the
`unknown` vs. `false` data rule from the backend spec.

### 2.5 The doctor is always the last word, visually
Every AI-populated field carries a small "AI-suggested" tag (soft, dashed underline
treatment) until a doctor edits or verifies it. On verify, the tag resolves to a solid
"Verified" checkmark treatment. This visual language is consistent everywhere structured
data appears — patient confirmation screen, doctor summary, any future export — so
verification status is legible at a glance, never requiring a tooltip to understand.

### 2.6 Flags interrupt calmly, not alarmingly
Priority-HIGH uses a firm but not flashing red banner (no animation/pulsing — clinical
environments need calm alerting, not app-style urgency tricks); contradiction/missing-info
use amber outline treatments, not modals — they inform without blocking flow unless the
doctor's action is truly required (e.g., verifying with an unacknowledged HIGH flag).

### 2.7 One-handed, one-thumb, gloved-friendly
Camp conditions mean devices are shared, sometimes handled quickly by health workers
assisting patients. All primary actions reachable within thumb range on a phone; minimum
touch target 44×44pt (48×48dp Android); no gesture-only interactions (no swipe-to-delete
as the only path — always a visible button alternative).

### 2.8 Consistent verbs, no synonyms for the same action
"Verify & Save" always means the same thing everywhere it appears. "Submit" is never
relabeled "Send" on a different screen. The confirmation toast after an action echoes the
button's verb ("Saved" after "Save", never "Success!" or "Done!"). This consistency is
what lets a doctor learn the app in one shift.

### 2.9 Errors state facts, not sentiment
No "Oops!" or "Something went wrong 😞". Errors name what happened and what to do:
"Couldn't reach the server. Your answers are saved — retrying automatically." Written in
the interface's voice, not an apologetic persona — this matters doubly in a clinical tool
where trust in accuracy is the whole point.

### 2.10 Motion is restrained and purposeful
Only three motion moments exist in the whole app: (1) the mic button's waveform while
recording, (2) the inline-chip appearance when a fact is captured (a single 150ms
fade/slide, not a bounce), (3) the AI_GENERATED → DOCTOR_VERIFIED resolve animation
(dashed → solid, ~200ms). No page-transition flourishes, no decorative loading animations
beyond a simple spinner — reduced-motion OS setting is respected everywhere.

---

## 3. Platform-Specific Rules
- **Patient surface:** optimized for phone-in-hand and shared-tablet-kiosk use;
  large icon-first navigation; no more than one primary action visible per screen.
- **Doctor surface:** optimized for tablet/desktop widths (front-desk iPad, clinic
  laptop); denser information display is acceptable here (doctors are trained readers
  under time pressure, opposite persona from the patient side) — but the AI-suggested vs.
  verified visual language stays identical across both surfaces for consistency.
- **Web (PWA):** must be installable, must work with keyboard navigation and visible
  focus states for accessibility compliance (WCAG 2.1 AA), even though primary usage is
  touch.

## 4. Accessibility Floor (non-negotiable, not a stretch goal)
- Color is never the only signal — every flag/status pairs a color with an icon and a text
  label.
- Minimum contrast ratio 4.5:1 for body text, 3:1 for large text/icons.
- All interactive elements keyboard-navigable on web with a visible focus ring
  (`2px solid var(--color-primary)` offset outline).
- `prefers-reduced-motion` disables the three motion moments above (they become instant
  state changes).
- Every audio-only affordance (TTS) has a text equivalent already on screen — audio is an
  aid, never the sole channel for critical information.

## 5. What This App Deliberately Avoids
- No chat-bubble-only interface pretending to be a generic messaging app — this is a
  structured intake instrument that *uses* conversational UI, not a chatbot skin.
- No dashboard-style KPI-tile homepage for doctors — the queue *is* the homepage; nothing
  competes with "who's next" for visual priority.
- No skeuomorphic medical iconography (stethoscopes, crosses everywhere) — icons are used
  functionally (mic, language, flag, checkmark), not decoratively.
- No dark mode as default (bright, glare-lit outdoor camp settings favor a legible light
  surface); dark mode may be offered as an accessibility option, not a design identity.
