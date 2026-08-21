# Localization / Multilingual Architecture

## 1. Scope
Source docs pitched 2–3 languages for the hackathon MVP demo. This build upgrades scope
to **support all 22 scheduled Indian languages, plus common dialect variants**, using an
honest tiered-coverage model rather than overclaiming uniform quality — directly
addressing the Round-1 feedback to "validate across different Indic languages, dialects,
accents, and noisy rural environments."

## 2. Language Tiering Model
| Tier | Definition | Initial Languages |
|---|---|---|
| Tier 1 | Full voice+text, actively QA'd, ASR WER tracked, dialect synonym dictionary populated | Hindi, Marathi, English |
| Tier 2 | Voice+text enabled via IndicWhisper/Bhashini, accuracy in beta, feedback loop active | Bengali, Tamil, Telugu, Gujarati, Kannada, Malayalam, Punjabi, Odia, Urdu |
| Tier 3 | Text-first (voice experimental/best-effort via Bhashini), flagged to user as beta | Remaining scheduled languages (Assamese, Bodo, Dogri, Kashmiri, Konkani, Maithili, Manipuri, Nepali, Sanskrit, Santali, Sindhi, ...) |

Tier is stored per-language in the `languages` table and surfaced in the UI
(`LanguageTierBadge`) so patients and doctors know current reliability — this keeps the
"all Indian languages supported" requirement truthful rather than a marketing overclaim,
which matters for a clinical tool.

## 3. Dialect & Synonym Normalization
- `clinical_concepts` + `concept_synonyms` tables (see DB Architecture) hold a growing,
  versioned dictionary mapping dialectal/colloquial terms to canonical concept IDs
  (e.g., `bukhar`, `jvara`, `kaaychal`, `tap` → `SYM_FEVER`).
- Dictionary seeded from clinical terminology references + community/ASHA worker input
  during pilot, continuously extended without code deploys (admin-writable table).
- LLM extraction step is prompted with the canonical concept list + few-shot synonym
  examples so it maps dialect terms even before the dictionary explicitly contains them;
  the dictionary is the audit/QA source of truth, the LLM is the flexible first pass.

## 4. Speech Stack per Language
- **ASR:** AI4Bharat IndicWhisper (OSS, self-hostable or via free inference) as primary;
  Bhashini ASR (Government of India, free API) as secondary/fallback and for languages
  IndicWhisper covers less well.
- **TTS:** AI4Bharat Indic-TTS (OSS) primary; Bhashini TTS fallback.
- Both are free/open resources, satisfying the "entire application using open-source, free
  resources" requirement — no paid commercial STT/TTS vendor required.

## 5. Accent & Noisy-Environment Handling
- Client-side basic noise gate (mic input) before upload, to reduce bandwidth and false
  transcriptions in noisy PHC waiting areas.
- Backend logs ASR confidence per turn; low-confidence turns trigger an in-app prompt:
  "I didn't catch that clearly — can you repeat, or type instead?" rather than silently
  guessing.
- Pilot testing plan explicitly includes real rural-camp audio capture (with consent) to
  measure per-language, per-environment WER — feeding the `asr_samples` metrics table and
  closing the loop the panel asked for.

## 6. UI Text Localization (chrome, not clinical content)
- Static UI strings (buttons, labels, instructions) translated per Tier-1/2 language using
  a simple JSON translation resource bundle (`/app/shared/i18n/<lang>.json`), loaded via
  `expo-localization`. Tier-3 languages fall back to English/Hindi UI chrome with
  voice/text clinical interaction still attempted in the patient's language where ASR
  supports it — decoupling "can the app UI be read" from "can the app understand the
  patient," since the latter is the actual clinical requirement.

## 7. Roadmap for Full Dialect Coverage
1. Pilot with Tier-1 languages, collect real accuracy data.
2. Expand synonym dictionary using pilot transcripts + clinician review.
3. Promote languages from Tier 3 → Tier 2 → Tier 1 as WER and completeness metrics improve.
4. Community contribution path (ASHA workers, linguists) for dialect terms, versioned via
   the same GitHub-tracked Supabase migrations process.
