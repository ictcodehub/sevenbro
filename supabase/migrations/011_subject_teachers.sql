-- Guru mapel untuk jadwal/brief (bukan akun login TEACHER)
create extension if not exists "pgcrypto";

create table if not exists subject_teachers (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  subject_name text not null,
  teacher_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (class_id, subject_name)
);

create index if not exists subject_teachers_class_idx
  on subject_teachers (class_id, subject_name);
