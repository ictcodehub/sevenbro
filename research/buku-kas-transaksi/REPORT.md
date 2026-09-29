# REPORT — Tab Transaksi Buku Kas

**Date:** 2026-09-29
**Scope:** `src/app/app/kas/buku/page.tsx` view `ledger`

## Findings

### 1. Current implementation (confusing)
- Tab Transaksi meng-agregat semua iuran per hari jadi satu baris dengan uraian `"16/16 Siswa"` (paid/total roster) — bukan transaksi nyata. [1]
- Iuran / Iuran khusus digabung per `occurred_on`; non-iuran pakai `shortUraian`. [1]
- Kolom: No · Tanggal · Uraian · Masuk · Keluar. **Saldo berjalan dihitung (`allWithSaldo`) tapi tidak dirender.** [1]
- Filter Semua/Masuk/Keluar ada; month chip di header vs data ledger bisa tidak sinkron. [1]
- Baris **backlog plot** (bulk 22 Sep) ikut tampil → tanggal Agustus–Oktober dengan nominal harian palsu. [2]

### 2. Data available
`Tx`: id, kind IN/OUT, category, description, amount, occurred_on, created_at, recorded_by. [2]
- IN: Iuran, Iuran harian, Iuran khusus
- OUT: Pengeluaran
- Backlog: `created_at` stempel `2026-09-22T10:05:47` — slot plot, bukan setoran harian nyata. [2]

### 3. Non-overlap (apa yang belum ada)
| Tab | Isi |
|---|---|
| Matriks | Plot slot 0/1/2 per minggu, lunas |
| Per Siswa | Rekap per siswa + riwayat bayar |
| **Transaksi (baru)** | **Jurnal kas: setiap arus uang masuk/keluar + saldo berjalan** |

Yang hilang: daftar transaksi individual, OUT tampil proper, saldo berjalan, jam, pencatat. [3]

## Design (refactor)

Tab Transaksi = **Buku Kas / Jurnal Kas**:

| No | Tanggal | Jam | Kategori | Uraian | Masuk | Keluar | Saldo |

- Satu baris = satu transaksi (tanpa agregat harian)
- Exclude backlog plot (`BACKLOG_PLOT_AT`)
- Month selector konsisten (`displayMonth`)
- Filter Semua / Masuk / Keluar
- Tap baris → detail modal (sudah ada)
- Bahasa Indonesia, kolom No wajib, `Rp.`

## Open questions
- Apakah baris backlog perlu ringkasan terpisah? (default: tidak tampil di jurnal)

## Sources
[1] explore-1 audit ledger code (buku/page.tsx ledgerLines, shortUraian, table)
[2] explore-2 data inventory (Tx, collect/transactions/summary routes, BACKLOG_PLOT_AT)
[3] explore-3 Matriks vs Per Siswa coverage map
