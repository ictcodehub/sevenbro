-- Kas: penanda Izin siswa (bukan uang, tidak mengubah saldo)
create table if not exists public.kas_izin (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  occurred_on date not null,
  note text,
  recorded_by text not null,
  created_at timestamptz not null default now(),
  unique (class_id, student_id, occurred_on)
);

create index if not exists idx_kas_izin_class_date on public.kas_izin(class_id, occurred_on);
create index if not exists idx_kas_izin_student on public.kas_izin(student_id);
