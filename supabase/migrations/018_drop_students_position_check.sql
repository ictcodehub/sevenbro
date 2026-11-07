-- Migration 018: Drop check constraint students_position_check to allow dynamic positions
-- Di project Supabase gdmqmoigudtgknkgomeu, students.position sebelumnya dibatasi oleh constraint:
-- check (position in ('KETUA','BENDAHARA','SEKRETARIS','ANGGOTA'))
-- Sejak fitur posisi dinamis / rotasi pengurus (commit 8ff1be2 & UI select), posisi diizinkan lebih fleksibel
-- (misal: WAKIL KETUA, WAKIL SEKRETARIS, WAKIL BENDAHARA, KOORDINATOR, dll).

alter table public.students drop constraint if exists students_position_check;
