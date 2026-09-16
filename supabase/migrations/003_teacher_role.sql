-- Seven Bro! — TEACHER role + teachers roster
-- Jalankan di Supabase SQL Editor (project gdmqmoigudtgknkgomeu)

-- 1. Longgarkan check constraint users.role
alter table public.users drop constraint if exists users_role_check;
alter table public.users
  add constraint users_role_check
  check (role in ('HOMEROOM', 'TEACHER', 'STUDENT', 'PENDING'));

-- 2. Tabel guru yang diizinkan homeroom
create table if not exists public.teachers (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default now(),
  unique (class_id, email)
);

create index if not exists idx_teachers_class on public.teachers(class_id);

-- 3. Trigger: role TEACHER saat login jika email terdaftar di teachers
create or replace function public.sync_user_role() returns trigger as $$
begin
  if new.role <> 'PENDING' then
    return new; -- jangan turunkan HOMEROOM/TEACHER/STUDENT
  end if;
  if exists (select 1 from public.classes c where c.homeroom_email = new.email) then
    new.role := 'HOMEROOM';
  elsif exists (select 1 from public.teachers t where t.email = new.email) then
    new.role := 'TEACHER';
  elsif exists (select 1 from public.students s where s.email = new.email) then
    new.role := 'STUDENT';
  end if;
  return new;
end $$ language plpgsql;

-- 4. Seed contoh guru
insert into public.teachers (class_id, email, name)
select c.id, 'teacher@mutiarabangsa.sch.id', 'Bu Guru (contoh)'
from public.classes c
where c.name = '7B'
on conflict (class_id, email) do nothing;

-- Jika user teacher@… sudah pernah login jadi PENDING, naikkan role
update public.users
set role = 'TEACHER'
where email = 'teacher@mutiarabangsa.sch.id'
  and role = 'PENDING';
