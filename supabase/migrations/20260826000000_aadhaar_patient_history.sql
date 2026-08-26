-- Aadhaar-linked patient identity + consultation history snapshot on intakes

alter table public.patients
  add column if not exists aadhaar_hash text,
  add column if not exists aadhaar_last4 text;

create unique index if not exists patients_aadhaar_hash_uidx
  on public.patients (aadhaar_hash)
  where aadhaar_hash is not null;

alter table public.intakes
  add column if not exists aadhaar_hash text,
  add column if not exists aadhaar_last4 text,
  add column if not exists turn_history jsonb not null default '[]'::jsonb,
  add column if not exists consultation_summary jsonb,
  add column if not exists language text;

create index if not exists intakes_aadhaar_hash_created_idx
  on public.intakes (aadhaar_hash, created_at desc)
  where aadhaar_hash is not null;

create index if not exists intakes_patient_created_idx
  on public.intakes (patient_id, created_at desc);
