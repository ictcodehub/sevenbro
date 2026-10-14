# Ticket 01: Info and Report Pagination Limits

## Status: Done

## Tasks
- [x] Di `src/components/MassReportPanel.tsx`:
  - [x] Ubah `DONE_PAGE_SIZE` dari 15 ke 10.
  - [x] Verifikasi navigasi pagination Previous/Next berjalan mulus untuk 10 baris per halaman.
- [x] Di `src/app/app/pengumuman/page.tsx`:
  - [x] Pastikan `PAGE_LIMIT = 15`.
  - [x] Pastikan kontrol pagination tampil dan responsif ketika total pengumuman > 15.
- [x] Jalankan typecheck & unit test.
