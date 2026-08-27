-- English consultation summary for doctor views (patient-language copy stays in consultation_summary)

alter table public.intakes
  add column if not exists consultation_summary_en jsonb;
