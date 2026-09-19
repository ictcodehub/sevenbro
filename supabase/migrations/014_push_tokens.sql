-- FCM token per device (Android shell / browser)
create extension if not exists "pgcrypto";

create table if not exists push_tokens (
  id uuid primary key default gen_random_uuid(),
  class_id uuid,
  user_email text not null,
  fcm_token text not null,
  platform text not null default 'android',
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (fcm_token)
);

create index if not exists push_tokens_email_idx
  on push_tokens (user_email, updated_at desc);

create index if not exists push_tokens_class_idx
  on push_tokens (class_id);
