# Database Architecture (Supabase / PostgreSQL)

## 1. Design Principles
- Clinical Knowledge Dataset (languages, canonical concepts, synonyms, question bank,
  priority rules) kept in **separate tables from patient-generated data**, per the source
  PPT ("Data Layer... Knowledge Dataset curated separately").
- Row Level Security (RLS) enabled on every table containing PII or clinical data.
- Every mutation to an intake field after AI generation is captured in `audit_log`
  (immutable, append-only) to satisfy the doctor-verification requirement.
- Missing values stored explicitly (`'unknown'`), never coerced to false/negative.

## 2. Core Schema

### `patients`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| display_name | text nullable | optional, patient may skip |
| age | int nullable | |
| gender | text nullable | |
| preferred_language | text | ISO/BCP-47-like code |
| dialect_hint | text nullable | |
| camp_id | uuid FK → camps | |
| created_at | timestamptz | |

### `sessions`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| patient_id | uuid FK | |
| status | enum(`IN_PROGRESS`,`SUBMITTED`,`ABANDONED`) | |
| collected_fields | jsonb | live working state during conversation |
| turn_history | jsonb[] | raw + normalized turns, for audit/QA |
| created_at / updated_at | timestamptz | |

### `intakes`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| session_id | uuid FK | |
| patient_id | uuid FK | |
| chief_complaint | text | canonical concept ID |
| duration | text | |
| symptoms | jsonb | array of {concept_id, duration, severity} |
| medical_history | jsonb | |
| medications | jsonb | |
| allergies | text | value or `'unknown'` |
| missing_information | text[] | field names flagged missing |
| contradictions | jsonb | list of {field, statement_a, statement_b, turn_refs} |
| priority_flag | enum(`HIGH`,`MEDIUM`,`LOW`,`NONE`) | set only by Rule Engine |
| ai_summary | text | LLM-generated doctor-facing summary |
| status | enum(`AI_GENERATED`,`DOCTOR_VERIFIED`) | **gate for downstream use** |
| doctor_id | uuid FK nullable | who verified |
| verified_at | timestamptz nullable | |
| created_at | timestamptz | |

### `audit_log`
| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| intake_id | uuid FK | |
| field_name | text | |
| old_value | jsonb | |
| new_value | jsonb | |
| changed_by | uuid FK → auth.users | |
| changed_at | timestamptz | |

### `camps`
| id, name, location, organizer, start_date, end_date |

### Clinical Knowledge Dataset (curated, versioned, editable without redeploy)
- `clinical_concepts` (`id`, `canonical_name`, `category`)
- `concept_synonyms` (`concept_id`, `language`, `dialect`, `synonym_text`)
- `question_bank` (`id`, `complaint_category`, `question_text_key`, `priority_order`)
- `priority_rules` (`id`, `condition_expr`, `resulting_flag`, `version`, `is_active`)
- `languages` (`code`, `name`, `tier`, `asr_supported`, `tts_supported`)

### Metrics
- `asr_samples` (`id`, `language`, `predicted_text`, `corrected_text`, `wer`, `created_at`)
- `session_metrics` (`session_id`, `duration_seconds`, `question_count`, `completeness_pct`)

## 3. RLS Policy Summary
- `patients`, `sessions`, `intakes`: patients (anonymous token) can only read/write their
  own `session_id`-scoped rows; doctors (authenticated, role=`doctor`) can read/write
  intakes belonging to their assigned camp; admins have camp-scoped full access.
- `audit_log`: insert-only for the API service role; read access restricted to
  admin/doctor of the owning camp; no update/delete permitted (immutability).
- Clinical Knowledge Dataset tables: public read (needed by client for language list),
  write restricted to admin role.

## 4. Migrations & Environments
- All schema changes as versioned SQL files in `/supabase/migrations`, applied via
  `supabase db push` in CI to `dev` → `staging` → `prod` Supabase projects, keeping the DB
  fully reproducible from the GitHub repo (no manual/local DB dependency).

## 5. Indexing Notes
- `intakes(status, priority_flag, created_at)` composite index for fast queue queries.
- `concept_synonyms(language, synonym_text)` index for normalization lookups.
- `audit_log(intake_id, changed_at)` for chronological trail retrieval.
