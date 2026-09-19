-- Info brief harian (Sekretaris) + master mapel
create extension if not exists "pgcrypto";

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  name text not null,
  short_name text,
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (class_id, name)
);

create index if not exists subjects_class_sort_idx
  on subjects (class_id, sort, name);

create table if not exists daily_briefs (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  date date not null,
  kind text not null default 'DAILY'
    check (kind in ('DAILY', 'GENERAL')),
  title text not null,
  greeting text,
  uniform text,
  uniform_note text,
  pinned boolean not null default false,
  payload jsonb not null default '{}'::jsonb,
  body_generated text not null default '',
  announcement_id uuid,
  created_by text,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Satu brief DAILY per kelas per tanggal
create unique index if not exists daily_briefs_class_date_daily_uidx
  on daily_briefs (class_id, date)
  where kind = 'DAILY';

create index if not exists daily_briefs_class_date_idx
  on daily_briefs (class_id, date desc);
