-- Soft-delete notif (riwayat bisa pulihkan; install ulang tidak memunculkan lagi)
-- + FK cascade: hapus Info → notif terkait ikut hilang
alter table notifications
  add column if not exists ref_id uuid;

alter table notifications
  add column if not exists deleted_at timestamptz;

create index if not exists notifications_ref_idx
  on notifications (ref_id);

create index if not exists notifications_deleted_idx
  on notifications (class_id, deleted_at);

-- Bersihkan orphan sebelum pasang FK
delete from notifications n
where n.ref_id is not null
  and not exists (select 1 from announcements a where a.id = n.ref_id);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'notifications_ref_id_fkey'
  ) then
    alter table notifications
      add constraint notifications_ref_id_fkey
      foreign key (ref_id)
      references announcements (id)
      on delete cascade;
  end if;
end $$;
