# Ticket 01: Idempotency & Double-Submit Protection for Mass Report Review

## Description
Tambahkan perlindungan double-submit pada review Mass Report baik di sisi client maupun server.

## Tasks
1. Di `src/app/api/mass-reports/[id]/review/route.ts`:
   - Ubah query update awal menjadi atomik: cek `status in ('READY', 'VOTING') and points_applied = false`. Jika sudah pernah diapply atau bukan status tersebut, return 409 Conflict.
2. Di `src/components/MassReportPanel.tsx`:
   - Tambahkan state `savingId: string | null` untuk men-disable tombol "Setujui" / "Tolak" saat request sedang berlangsung.
