-- Roster proposals: Ketua mengusul perubahan roster, Homeroom approve/reject
create extension if not exists "pgcrypto";

create table if not exists roster_proposals (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  action text not null check (action in ('ADD', 'UPDATE', 'DELETE')),
  student_id uuid,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  proposed_by text not null,
  proposed_by_name text,
  reviewed_by text,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists roster_proposals_class_status_idx
  on roster_proposals (class_id, status, created_at desc);
