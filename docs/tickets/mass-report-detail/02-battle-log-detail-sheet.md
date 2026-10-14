# Ticket 02: Tap Battle Log Item for Detailed Information & Mass Report Modal

## Description
Buat setiap item riwayat di Battle Log (`HistoryList`) dapat di-klik/tap untuk menampilkan sheet detail lengkap mengenai peristiwa poin tersebut (termasuk detail Mass Report jika terkait).

## Tasks
1. Di `src/app/app/poin/page.tsx`:
   - Tambahkan state `selectedLog: PointLog | null` di `PoinInner` atau `HistoryList`.
   - Update `HistoryList` agar baris log membungkus tombol interaktif yang memicu pembukaan Sheet Detail.
   - Sediakan komponen `PointDetailSheet` yang menampilkan:
     - Header jenis (Prestasi vs Pelanggaran) & Nilai Poin.
     - Alasan / Deskripsi lengkap.
     - Nama siswa target & posisi jika ada.
     - Dicatat oleh & Tanggal/Waktu lengkap.
     - Jika transaksi dari Mass Report (`created_by === 'system@mutiarabangsa.sch.id'`), hubungkan atau tampilkan badge penjelas Mass Report resmi.
2. Tambahkan lokalisasi teks jika diperlukan di `src/lib/locales.ts`.
