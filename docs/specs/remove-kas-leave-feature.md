# Spec: Penghapusan Fitur & Tombol Leave (Izin) di Halaman Kas

## 1. Context & Motivation
- **User Request:** "hapus fitur dan tombol Leave ini dong, gak pernah kepake dan gak guna juga"
- **Scope:**
  - Di halaman Kas (`/app/app/kas/page.tsx`), terdapat tab toggle filter/aksi `[Pay] [Leave]` di panel Today's Deposit.
  - Terdapat juga kolom `LEAVE` di header tabel setoran dan kolom radio/indikator izin di setiap baris siswa.
  - Fitur izin ini jarang/tidak pernah digunakan dan membingungkan bendahara saat mencatat setoran kas harian.

## 2. Requirements & UI Changes
1. **Hapus Tombol & Mode "Leave" dari Header Tab:**
   - Hapus switch `Pay` vs `Leave`.
   - Hanya mode pembayaran kas harian (`bayar`).
   - Counter total setoran selalu menghitung nominal rupiah (`totalRupiah`).
2. **Sederhanakan Tabel Setoran Siswa:**
   - Header tabel: `[ NO ] [ NAME ] [ PAY / CHECKBOX ]`. (Kolom `LEAVE` dihapus).
   - Baris siswa: Setiap baris cukup menampilkan nomor, nama siswa, info status (arrears/paid off), dan 1 checkbox setoran.
   - Mengklik baris siswa langsung mengaktifkan/menonaktifkan centang bayar.
3. **Pembersihan Handler:**
   - Hapus state `markMode` (`bayar` vs `izin`).
   - Sederhanakan `saveCollect`, `selectAll`, `clearAll` agar fokus pada setoran kas bayar.

## 3. Acceptance Criteria
- [ ] Tombol `Leave` di panel Today's Deposit hilang.
- [ ] Kolom `LEAVE` di tabel siswa hilang.
- [ ] Fungsi centang dan simpan setoran harian kas tetap berfungsi normal 100%.
- [ ] Quality gate: `npm run typecheck` dan `npx vitest run` hijau.
