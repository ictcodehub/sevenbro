# Spec: Detail Mass Report pada Battle Log & Idempotency Review

## 1. Context & Motivation
- **Problem 1 (Race Condition / Duplikasi Poin):** Ketika Homeroom menekan tombol "Setujui" berulang kali di modal atau panel review Mass Report, API mengeksekusi insert ke tabel `points` berulang kali sebelum status report berganti.
- **Problem 2 (Kurang Informatif):** Pengguna melihat penalti pelanggaran di tab "Battle Log" di `/app/poin`, tetapi tidak bisa mengklik/tap baris tersebut untuk mengetahui konteksnya (apakah ini hasil Mass Report, apa alasannya, siapa target lain jika ada, catatan, bukti foto, serta hasil voting).

## 2. Goals
1. **Idempotency & Double-Submit Protection**:
   - Backend `POST /api/mass-reports/[id]/review`: Menjamin pengubahan status dan pengurangan poin bersifat atomik/idempoten. Jika status sudah bukan `READY` / `VOTING`, atau `points_applied` sudah true, tolak request berturut-turut.
   - Frontend `MassReportPanel.tsx` & `MassReportVoteModal.tsx`: Menambahkan state `saving` dan men-disable tombol aksi saat request sedang dikirim.
2. **Keterkaitan Data Log Poin dengan Mass Report**:
   - Mengaitkan transaksi poin dengan Mass Report yang bersangkutan (misal melalui query pencarian atau referensi report yang cocok berdasar `reason` dan target/waktu, atau match pada daftar reports yang sudah approved).
3. **Interaktivitas UI Battle Log**:
   - Setiap baris riwayat di `HistoryList` pada `/app/poin` dapat di-tap/klik jika berkaitan dengan Mass Report atau penalti/prestasi untuk membuka Sheet Detail yang informatif.
   - Sheet menampilkan: Alasan, Kategori (Pelanggaran/Prestasi), Poin, Catatan/Note, Waktu, Pelapor/Pemberi Poin, dan status/info Mass Report jika ada (beserta bukti foto jika ada).

## 3. Architecture & Design Decisions
- Menggunakan komponen `Sheet` bawaan Seven Bro! (`@/components/ui/sheet`) yang mobile-friendly (bottom sheet).
- Tidak memecah struktur database schema yang sudah ada, tetap memanfaatkan data dari API `/api/mass-reports` atau endpoint detail report.
- Menjaga dukungan bilingual (Indonesian & English) via `useT()`.

## 4. Acceptance Criteria
- [ ] Klik berulang pada tombol review tidak akan menduplikasi pemotongan poin (HTTP 409 jika sudah diproses).
- [ ] Tombol review menampilkan loading / disabled saat mutasi berlangsung.
- [ ] Baris Battle Log di `/app/poin` memiliki visual affordance (cursor pointer, tap active state) dan saat di-tap membuka modal/sheet detail.
- [ ] Quality gate: `npm run typecheck` dan `npx vitest run` 100% lolos.
