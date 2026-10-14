# Ticket 02: Endpoint & UI Pembatalan (Revert / Undo) Hasil Approval Mass Report

## Tasks
1. Buat endpoint `POST /api/mass-reports/[id]/revert/route.ts`:
   - Role guard: `canReviewMassReport` (Homeroom).
   - Pastikan report berstatus `APPROVED` dan `points_applied === true`.
   - Kembalikan poin target (delete poin terkait atau insert kompensasi pembatalan).
   - Update report: `status = "CLOSED"` atau `"VOTING"` (atau kembalikan ke status semula dengan `points_applied = false`).
2. Di `src/components/MassReportPanel.tsx`:
   - Tambahkan tombol "Batalkan" / "Undo" pada laporan di daftar riwayat atau detail laporan bagi Homeroom.
   - Panggil endpoint `/api/mass-reports/[id]/revert` dan refresh data SWR.
