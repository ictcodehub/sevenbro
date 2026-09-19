-- Setting fitur kelas (Homeroom) — kontrol menu murid
create extension if not exists "pgcrypto";

create table if not exists class_settings (
  class_id uuid primary key,
  kas_enabled boolean not null default true,
  agenda_enabled boolean not null default true,
  poin_enabled boolean not null default true,
  info_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);
