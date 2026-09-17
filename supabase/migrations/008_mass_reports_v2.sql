-- Mass Report v2: custom report + foto bukti + preset khusus Homeroom
alter table mass_reports
  add column if not exists is_custom boolean not null default false,
  add column if not exists original_reason text,
  add column if not exists photo_data text,
  add column if not exists photo_mime text;

create table if not exists report_presets (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  label text not null,
  delta int not null default 1,
  approved_by text,
  source_report_id uuid references mass_reports(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists report_presets_class_idx
  on report_presets (class_id, created_at desc);
