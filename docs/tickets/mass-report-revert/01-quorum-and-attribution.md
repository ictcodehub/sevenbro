# Ticket 01: Atribusi Pelapor Asli & Kunci Kuorum Review (Minimal 10 Vote)

## Tasks
1. `src/app/api/mass-reports/[id]/review/route.ts`:
   - Validasi: Jika `decision === "APPROVED"` dan `report.status === "VOTING"`, tolak dengan status 400 (`"Laporan belum memenuhi kuorum 10 vote"`).
   - Ubah `created_by` saat insert poin menjadi `report.created_by` (email Ketua Kelas), bukan `system@...`.
2. `src/components/MassReportPanel.tsx`:
   - Pada tombol "Setujui" / "Accept", jika status masih `VOTING` atau `r.voteCount < r.threshold`, tombol di-disable dan diberi label/keterangan kuorum belum cukup.
