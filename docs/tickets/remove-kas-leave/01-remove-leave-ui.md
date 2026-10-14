# Ticket 01: Remove Leave Buttons & Table Column from Kas Page

## Status: Done

## Tasks
- [x] Di `src/app/app/kas/page.tsx`:
  - [x] Hapus state `markMode` dan SWR izin.
  - [x] Hapus tombol toggle `Leave` di sebelah `Pay`.
  - [x] Hapus kolom `LEAVE` dari header tabel dan baris siswa.
  - [x] Sederhanakan fungsi `toggle`, `selectAll`, `clearAll`, dan `saveCollect`.
  - [x] Hapus referensi error/warning terkait izin kas.
- [x] Jalankan quality gate: `npm run typecheck` & `npx vitest run` (hijau).
