-- 07_DB_Architecture full schema + RLS (12_Safety)
-- Applied via supabase db push in CI. Additive-first.

create extension if not exists "pgcrypto";

do $$ begin
  create type session_status as enum ('IN_PROGRESS', 'SUBMITTED', 'ABANDONED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type intake_status as enum ('AI_GENERATED', 'DOCTOR_VERIFIED');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type priority_flag as enum ('HIGH', 'MEDIUM', 'LOW', 'NONE');
exception when duplicate_object then null;
end $$;

create table if not exists public.camps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  location text,
  organizer text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  display_name text,
  age int,
  gender text,
  preferred_language text not null default 'en',
  dialect_hint text,
  camp_id uuid references public.camps(id),
  created_at timestamptz not null default now()
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id),
  status session_status not null default 'IN_PROGRESS',
  collected_fields jsonb not null default '{}'::jsonb,
  turn_history jsonb not null default '[]'::jsonb,
  pending_questions jsonb not null default '[]'::jsonb,
  question_count int not null default 0,
  missing_fields text[] not null default '{}',
  contradictions jsonb not null default '[]'::jsonb,
  priority_flag priority_flag not null default 'NONE',
  language text not null default 'en',
  dialect_hint text,
  model_version text,
  audio_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.intakes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id),
  patient_id uuid not null references public.patients(id),
  chief_complaint text,
  duration text,
  symptoms jsonb not null default '[]'::jsonb,
  medical_history jsonb,
  medications jsonb,
  allergies text not null default 'unknown',
  missing_information text[] not null default '{}',
  contradictions jsonb not null default '[]'::jsonb,
  priority_flag priority_flag not null default 'NONE',
  ai_summary text,
  structured_fields jsonb not null default '{}'::jsonb,
  status intake_status not null default 'AI_GENERATED',
  doctor_id uuid,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  constraint allergies_unknown_or_text check (allergies is not null)
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.intakes(id),
  field_name text not null,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid,
  changed_at timestamptz not null default now()
);

create table if not exists public.clinical_concepts (
  id text primary key,
  canonical_name text not null,
  category text not null
);

create table if not exists public.concept_synonyms (
  id uuid primary key default gen_random_uuid(),
  concept_id text not null references public.clinical_concepts(id),
  language text not null,
  dialect text,
  synonym_text text not null
);

create table if not exists public.question_bank (
  id text primary key,
  complaint_category text not null,
  field text not null,
  question_text_key text not null,
  priority_order int not null default 100
);

create table if not exists public.priority_rules (
  id text primary key,
  condition_expr text not null,
  resulting_flag priority_flag not null,
  version int not null default 1,
  is_active boolean not null default true
);

create table if not exists public.languages (
  code text primary key,
  name text not null,
  native_name text not null,
  script text,
  tier int not null check (tier in (1, 2, 3)),
  asr_supported boolean not null default false,
  tts_supported boolean not null default false
);

create table if not exists public.asr_samples (
  id uuid primary key default gen_random_uuid(),
  language text not null,
  predicted_text text not null,
  corrected_text text,
  wer numeric,
  session_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.session_metrics (
  session_id uuid primary key references public.sessions(id),
  duration_seconds numeric,
  question_count int,
  completeness_pct numeric
);

create index if not exists intakes_queue_idx on public.intakes (status, priority_flag, created_at);
create index if not exists concept_synonyms_lookup_idx on public.concept_synonyms (language, synonym_text);
create index if not exists audit_log_intake_idx on public.audit_log (intake_id, changed_at);

alter table public.patients enable row level security;
alter table public.sessions enable row level security;
alter table public.intakes enable row level security;
alter table public.audit_log enable row level security;
alter table public.camps enable row level security;
alter table public.asr_samples enable row level security;
alter table public.session_metrics enable row level security;
alter table public.clinical_concepts enable row level security;
alter table public.concept_synonyms enable row level security;
alter table public.question_bank enable row level security;
alter table public.priority_rules enable row level security;
alter table public.languages enable row level security;

-- Knowledge tables: public read, admin write via service role (no policy = service role only for writes)
drop policy if exists languages_read on public.languages;
create policy languages_read on public.languages for select using (true);
drop policy if exists concepts_read on public.clinical_concepts;
create policy concepts_read on public.clinical_concepts for select using (true);
drop policy if exists synonyms_read on public.concept_synonyms;
create policy synonyms_read on public.concept_synonyms for select using (true);
drop policy if exists questions_read on public.question_bank;
create policy questions_read on public.question_bank for select using (true);
drop policy if exists priority_rules_read on public.priority_rules;
create policy priority_rules_read on public.priority_rules for select using (true);

-- Staff access uses app_metadata.role (never user_metadata).
drop policy if exists camps_staff_read on public.camps;
create policy camps_staff_read on public.camps for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('doctor', 'admin'));

drop policy if exists patients_staff on public.patients;
create policy patients_staff on public.patients for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('doctor', 'admin'));

drop policy if exists sessions_staff on public.sessions;
create policy sessions_staff on public.sessions for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('doctor', 'admin'));

drop policy if exists intakes_staff_select on public.intakes;
create policy intakes_staff_select on public.intakes for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('doctor', 'admin'));

drop policy if exists intakes_staff_update on public.intakes;
create policy intakes_staff_update on public.intakes for update
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('doctor', 'admin'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('doctor', 'admin'));

drop policy if exists audit_staff_read on public.audit_log;
create policy audit_staff_read on public.audit_log for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('doctor', 'admin'));

drop policy if exists audit_staff_insert on public.audit_log;
create policy audit_staff_insert on public.audit_log for insert
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('doctor', 'admin'));

drop policy if exists metrics_staff on public.asr_samples;
create policy metrics_staff on public.asr_samples for all
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('doctor', 'admin'))
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') in ('doctor', 'admin'));

drop policy if exists session_metrics_staff on public.session_metrics;
create policy session_metrics_staff on public.session_metrics for select
  using ((auth.jwt() -> 'app_metadata' ->> 'role') in ('doctor', 'admin'));

-- audit_log is insert+select only; revoke update/delete from authenticated
revoke update, delete on public.audit_log from authenticated, anon;
