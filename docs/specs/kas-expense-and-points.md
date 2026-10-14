# Spec: Perbaikan Pengeluaran Kas, Pengembalian Sisa Belanja, dan Penghapusan Poin Bayar Kas

> Status: `ready-for-agent`  
> Tanggal: 2026-10-14  
> Tracker: Local Markdown (`docs/specs/`)

---

## Problem Statement

1. **Pengeluaran Kas Terpotong dan Terduplikasi**:
   Saat Bendahara (Mishella) menarik uang kas Rp 30.000 untuk pembelian tissue dan mengetik "30.000" dengan tanda titik ribuan, sistem mencatat nominal pengeluaran menjadi Rp 30 (karena JavaScript mem-parsing `30.000` sebagai float 30). Selain itu, ketiadaan kunci konkurensi (double submit lock) menyebabkan tombol tersubmit dua kali cepat, sehingga tercatat dua transaksi keluar Rp 30 (total Rp 60).
2. **Tidak Ada Fitur Pengembalian Sisa Belanja (Refund Dana Kas)**:
   Saat uang kas ditarik untuk suatu keperluan belanja dan terdapat uang kembalian (sisa belanja), Bendahara atau Homeroom tidak memiliki alur khusus untuk mengembalikan uang sisa tersebut ke dalam kas.
3. **Celah Poin dari Pembayaran Kas**:
   Sistem saat ini otomatis memberikan +1 poin prestasi setiap kali siswa membayar uang kas. Hal ini menjadi celah bagi siswa untuk mem-boost poin leaderboard hanya dengan menyetor uang kas.

---

## Solution

1. **Form Pengeluaran Presisi & Anti-Double Submit**:
   - Normalisasi input nominal agar ramah pengetikan angka rupiah Indonesia (menghapus karakter non-digit sebelum konversi integer: `replace(/\D/g, "")`).
   - Menyediakan quick chips nominal (10k, 20k, 30k, 50k, 100k) dan preview format Rupiah langsung.
   - Mengunci tombol submit dengan `useRef` agar tidak dapat diklik ganda dalam rentang waktu singkat.
   - Mengoreksi data transaksi di database: mengubah 1 transaksi belanja tissue Mishella menjadi Rp 30.000 dan menghapus transaksi duplikatnya.
2. **Menu Pengembalian Sisa Belanja (Refund Kas)**:
   - Menyediakan form "Sisa Belanja / Pengembalian Dana" di menu Kas.
   - Transaksi dicatat sebagai transaksi masuk (`kind: "IN"`) dengan kategori `"Sisa Pengeluaran"`.
   - Saldo kas bertambah kembali secara transparan dan tampil di Buku Kas / Jurnal Transaksi tanpa tercampur dengan iuran siswa.
3. **Penghapusan Poin Bayar Kas**:
   - Menghapus logika auto-point dari setoran harian dan bayar khusus.
   - Membersihkan seluruh 25 riwayat poin dengan alasan "Bayar Uang Kas" yang sudah tercatat di database agar leaderboard bersih dan adil.
   - Memperbarui dokumentasi sistem poin (SSOT `docs/POINT_SYSTEM.md`).

---

## User Stories

1. Sebagai Bendahara, saya ingin mengetik nominal pengeluaran seperti `30.000` atau `30000` tanpa risiko terpotong menjadi desimal, agar nominal yang tercatat selalu sesuai dengan uang fisik yang ditarik.
2. Sebagai Bendahara, saya ingin tombol Simpan di form Pengeluaran memiliki proteksi klik ganda, agar transaksi tidak tercatat dobel saat koneksi internet lambat atau saat tombol tertekan dua kali.
3. Sebagai Bendahara, saya ingin memilih chips nominal cepat (10k, 20k, 30k, 50k, 100k) di form Pengeluaran, agar penginputan pengeluaran rutin menjadi lebih cepat.
4. Sebagai Bendahara dan Homeroom, saya ingin memiliki tombol "Sisa Belanja" di menu Kas, agar saya dapat mencatat uang kembalian dari pengeluaran yang telah dilakukan sebelumnya.
5. Sebagai Bendahara, saya ingin memasukkan nominal sisa belanja dan keterangan (mis. "Sisa belanja tissue") pada form pengembalian dana, agar histori transaksi jelas dan saldo kas kembali utuh.
6. Sebagai Siswa dan Pengurus, saya ingin melihat transaksi sisa belanja tercatat di Buku Kas sebagai pemasukan dengan kategori "Sisa Pengeluaran", agar audit kas kelas akurat dan transparan.
7. Sebagai Homeroom dan Siswa, saya ingin sistem tidak memberikan poin prestasi saat siswa membayar uang kas, agar poin kelas murni merefleksikan prestasi belajar dan kepatuhan aturan sekolah, bukan kemampuan finansial atau setoran kas.
8. Sebagai Homeroom, saya ingin riwayat poin "Bayar Uang Kas" yang terlanjur tercatat di masa lalu dibersihkan, agar papan peringkat (Leaderboard) kembali adil bagi seluruh siswa.

---

## Implementation Decisions

1. **Normalisasi Input Nominal Kas**:
   - Semua input nominal bebas di form Kas (Pengeluaran dan Sisa Belanja) menggunakan penanganan string yang membersihkan tanda titik dan koma (`val.replace(/\D/g, "")`) sebelum dikonversi ke `Number()`.
   - Menggunakan ref synchronous lock (`isSubmittingRef.current = true`) di event handler form sebelum await fetch untuk mencegah request ganda.
2. **Kategori Transaksi Sisa Belanja**:
   - Transaksi masuk menggunakan `kind: "IN"` dan `category: "Sisa Pengeluaran"`.
   - Nilai tidak memerlukan `student_id` (karena bukan iuran perorangan siswa), melainkan pemasukan kas umum kelas.
   - Terintegrasi dengan i18n (`src/lib/locales.ts`) untuk bahasa Indonesia dan Inggris.
3. **Koreksi Data Belanja Tissue di Supabase**:
   - Update 1 record pada tabel `transactions` (`description = 'Beli tissue'`) menjadi `amount = 30000`.
   - Hapus record duplikat (`description = 'Tissue'`).
4. **Pencabutan Integrasi Poin Kas**:
   - Hapus pemanggilan `awardKasPoint` pada endpoint API `/api/kas/collect` dan `/api/kas/transactions`.
   - Hapus/nonaktifkan helper `src/lib/kas-points.ts`.
   - Eksekusi pembersihan data di tabel `points` untuk `reason = 'Bayar Uang Kas'`.
   - Update SSOT `docs/POINT_SYSTEM.md`, `docs/PROGRESS.md`, dan `docs/SESSION_SYNC.md`.

---

## Testing Decisions

- **Unit Testing**:
  - Pengujian helper normalisasi dan kalkulasi nominal input kas.
  - Verifikasi bahwa route `/api/kas/collect` dan `/api/kas/transactions` tidak lagi memanggil/menghasilkan mutasi poin.
- **Integration & Regression Testing**:
  - `npm run typecheck`: memastikan ketiadaan dead-import atau ketidakcocokan tipe.
  - `npx vitest run`: memastikan 212 tests yang ada tetap 100% lulus.
- **Database & Data Verification**:
  - Verifikasi query Supabase untuk memastikan tabel `points` bebas dari "Bayar Uang Kas" dan transaksi tissue bernilai Rp 30.000 tunggal.

---

## Out of Scope

- Penambahan sistem lampiran struk/foto nota belanja (struk fisik tetap disimpan manual oleh Bendahara).
- Fitur penarikan kas otomatis berkala.
