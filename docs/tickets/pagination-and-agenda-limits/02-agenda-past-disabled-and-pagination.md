# Ticket 02: Agenda Past Event Disabled and 10 Row Limit

## Status: Done

## Tasks
- [x] Di `src/app/api/events/route.ts`:
  - [x] Hapus penghapusan otomatis data `pastIds`.
  - [x] Kembalikan daftar events yang mencakup event mendatang dan yang telah lampau.
- [x] Di `src/components/ui-primitives.tsx`:
  - [x] Tambahkan prop `disabled?: boolean` pada `TimelineItem` dengan styling visual redup (opacity-55, border-line, badge ended).
- [x] Di `src/app/app/agenda/page.tsx`:
  - [x] Ubah `PAGE_LIMIT` menjadi 10.
  - [x] Urutkan event: mendatang terdekat di atas, event lampau di bawah dengan status `isPast`.
  - [x] Teruskan `disabled={isPast}` ke `TimelineItem`, dan disable/sembunyikan tombol edit saat event sudah lewat.
- [x] Jalankan quality gate: `npm run typecheck` & `npx vitest run`.
