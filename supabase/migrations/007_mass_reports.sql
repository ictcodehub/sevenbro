-- Mass Report: Ketua buat laporan → anggota vote → Homeroom approve
create extension if not exists "pgcrypto";

create table if not exists mass_reports (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  reason text not null,
  delta int not null default 1,
  note text,
  -- target siswa (jsonb array of student uuid)
  target_ids uuid[] not null default '{}',
  target_names text[] not null default '{}',
  status text not null default 'VOTING'
    check (status in ('VOTING', 'READY', 'APPROVED', 'REJECTED', 'CLOSED')),
  created_by text not null,
  created_by_name text,
  created_at timestamptz not null default now(),
  reviewed_by text,
  review_note text,
  reviewed_at timestamptz,
  points_applied boolean not null default false
);

create table if not exists mass_report_votes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references mass_reports(id) on delete cascade,
  voter_email text not null,
  voter_name text,
  created_at timestamptz not null default now(),
  unique (report_id, voter_email)
);

create index if not exists mass_reports_class_idx
  on mass_reports (class_id, status, created_at desc);

create index if not exists mass_report_votes_report_idx
  on mass_report_votes (report_id);
