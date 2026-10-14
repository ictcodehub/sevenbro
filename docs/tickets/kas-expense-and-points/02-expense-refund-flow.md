# 02: Expense Refund Flow (Sisa Belanja)

**What to build:**
Sediakan fitur bagi Bendahara & Homeroom untuk mencatat pengembalian dana / kembalian dari pengeluaran kas yang tersisa ("Sisa Belanja"). Transaksi tercatat sebagai pemasukan (`kind: "IN"`) dengan kategori `"Sisa Pengeluaran"` sehingga saldo kas bertambah kembali secara transparan dan tampil di Buku Kas / Jurnal Transaksi.

**Blocked by:** 01: Fix Expense Form & Database Correction

**Status:** done

- [x] Tambahkan tombol aksi "Sisa Belanja" di menu Kas (sejajar dengan Bayar Khusus dan Pengeluaran)
- [x] Buat Sheet form "Sisa Belanja / Pengembalian Dana" dengan input keterangan, nominal terformat, dan tanggal kejadian
- [x] Implementasikan handler submit yang memanggil `POST /api/kas/transactions` dengan `kind: "IN"` dan `category: "Sisa Pengeluaran"`
- [x] Tambahkan entri i18n di `src/lib/locales.ts` (ID & EN) untuk Sisa Belanja
- [x] Pastikan transaksi tampil di Buku Kas / Jurnal Transaksi dengan badge kategori yang rapi
