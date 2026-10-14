# Spec: Perbaikan Atribusi Pelapor, Syarat Kuorum Review Mass Report, dan Fitur Batalkan (Revert) Review

## 1. Background & Masalah
1. **Email `system@mutiarabangsa.sch.id`**:
   - Di `src/app/api/mass-reports/[id]/review/route.ts:58`, server meng-hardcode `created_by: "system@mutiarabangsa.sch.id"` saat insert ke tabel `points`.
   - Padahal pembuat laporan (`report.created_by`) adalah Ketua Kelas (misal `edmundgracio@mutiarabangsa.sch.id`), dan yang menyetujui adalah Wali Kelas (`ctx.email`). Email `system@...` tidak pernah ada di sekolah.
2. **Tombol "Accept" Bisa Diklik Saat Belum Memenuhi 10 Votes**:
   - Di `MassReportPanel.tsx:326`, pengecekan render tombol adalah `r.status === "READY" || r.status === "VOTING"`.
   - Akibatnya, pada status `VOTING` (misalnya baru 3 votes seperti pada report *"Ganggu Proses Belajar"*), tombol **Accept** tetap aktif dan bisa ditekan langsung oleh Homeroom.
   - Aturan sistem: Homeroom hanya boleh Approve/Accept jika laporan sudah **`READY`** (sudah memenuhi kuorum threshold minimal 10 suara). Jika masih `VOTING`, tombol Accept harus disabled / hanya boleh Tolak/Batal.
3. **Belum Ada Fitur Batalkan (Revert / Undo) Hasil Approval Mass Report**:
   - Jika Homeroom salah atau tidak sengaja menyetujui laporan yang belum memenuhi syarat, tidak ada tombol untuk membatalkan (mengembalikan poin target yang sudah dipotong, dan mengembalikan status report ke VOTING atau CLOSED/REVERTED).

## 2. Solusi & Perubahan
1. **Atribusi Pelapor & Reviewer**:
   - Pada `POST /api/mass-reports/[id]/review`, ubah `created_by` poin menjadi email pelapor (`report.created_by`) atau cantumkan nama pelapor & reviewer pada catatan.
   - Di tampilan Battle Log detail, tampilkan "Dilaporkan oleh: [Ketua Kelas]" dan "Disetujui oleh: [Wali Kelas]" secara transparan.
2. **Kunci Syarat Kuorum (10 Votes)**:
   - Frontend: Di `MassReportPanel.tsx`, tombol **Accept** hanya aktif jika status laporan adalah `READY` (atau `voteCount >= threshold`). Jika masih `VOTING`, tombol disabled dengan tooltip / teks info "Menunggu 10 vote".
   - Backend: Di `review/route.ts`, jika Homeroom memilih `APPROVED`, pastikan status report adalah `READY` (atau `voteCount >= threshold`). Jika masih `VOTING`, tolak dengan error 400.
3. **Fitur Batalkan / Revert Approval Mass Report**:
   - Endpoint `POST /api/mass-reports/[id]/revert` (hanya Homeroom).
   - Menghapus atau mengembalikan poin target (`+delta` kompensasi atau delete baris penalti terkait), serta mengembalikan status report.
   - Tombol "Batalkan Laporan" pada panel riwayat laporan yang sudah approved.

## 3. Acceptance Criteria
- [ ] Poin Mass Report mencantumkan email/nama asli pelapor & disetujui wali kelas, bukan email fiktif system.
- [ ] Tombol "Accept" Mass Report tidak dapat ditekan jika votes < threshold (10 votes).
- [ ] Tersedia tombol "Batalkan Approval" untuk Homeroom membatalkan laporan yang salah approved beserta pemulihan poin siswa.
- [ ] Lolos typecheck dan vitest.
