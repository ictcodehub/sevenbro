-- Notifikasi kelas (server-side) — target Homeroom / email tertentu
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null,
  title text not null,
  body text not null,
  kind text,
  -- HOMEROOM = semua wali kelas; selain itu = email penerima
  audience text not null default 'HOMEROOM',
  actor_email text,
  actor_name text,
  created_at timestamptz not null default now()
);

create index if not exists notifications_class_created_idx
  on notifications (class_id, created_at desc);

create index if not exists notifications_audience_idx
  on notifications (audience, created_at desc);
