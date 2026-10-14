# Ticket 01: Auto Unpin Previous Daily Briefs

## Status: Done

## Tasks
- [x] Di `src/app/api/info-briefs/route.ts`:
  - [x] Jika `pinned === true`, unpin semua daily_briefs lain di kelas dan unpin announcements pasangannya.
- [x] Di `src/app/api/announcements/[id]/route.ts`:
  - [x] Sinkronkan status pinned dengan tabel `daily_briefs`.
  - [x] Jika announcement yang dipin merupakan daily brief, otomatis unpin daily brief dan announcement brief lainnya.
- [x] Jalankan quality gate: `npm run typecheck` & `npx vitest run`.
