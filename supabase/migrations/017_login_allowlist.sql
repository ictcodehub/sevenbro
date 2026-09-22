-- Advanced security: whitelist email yang boleh sign-in
-- Selain siswa aktif / teachers / homeroom — untuk guru mapel / staf yang belum terdaftar penuh.

create extension if not exists "pgcrypto";

create table if not exists login_allowlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  note text,
  created_by text,
  created_at timestamptz not null default now(),
  unique (email)
);

create index if not exists idx_login_allowlist_email on login_allowlist (email);
