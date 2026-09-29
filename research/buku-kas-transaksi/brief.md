# Brief — Audit + Refactor tab Transaksi (Buku Kas)

**Date:** 2026-09-29
**Mode:** standard (codebase audit + product refactor)
**Audience:** Seven Bro! class cash book (Buku Kas) users — homeroom, bendahara, students

## Refined question

Tab **Transaksi** di Buku Kas (`src/app/app/kas/buku/page.tsx`, view `ledger`) saat ini membingungkan: user tidak paham fungsi dan isi layar. Layar menampilkan agregat harian dengan uraian aneh (mis. "16/16 Siswa") dan mencampur baris backlog plot dengan transaksi nyata.

**Tugas:** audit ulang, lalu refactor tab ini agar:
1. Fungsinya jelas (bukan dobel dengan Matriks / Per Siswa)
2. Menampilkan data kas yang proper dan spesifik
3. Cocok dengan aturan project (Bahasa Indonesia, tabel wajib kolom No, format Rp., mobile-first)

## Scope

**In:**
- `view === "ledger"` di `kas/buku/page.tsx` (UI + `ledgerLines` computation)
- Locale keys `kas.tabLedger` dan terkait
- Definisi data: `Tx`, `sortKey`, `shortUraian`, filter `only` (all/IN/OUT)
- Hubungan dengan `class_cash_summary` / saldo

**Out:**
- Tab Matriks (sudah punya plot slot mingguan)
- Tab Per Siswa (sudah punya rekap + riwayat per siswa)
- API write (collect / transactions POST)
- Android shell

## Assumptions

- "Transaksi" harus menjadi **buku kas / log arus uang** (setiap transaksi nyata: tanggal, jam, kategori, uraian, masuk, keluar, saldo berjalan, pencatat)
- Baris **backlog plot** (bulk 22 Sep, `created_at` stempel backlog) bukan transaksi kas harian — jangan tampil sebagai baris ledger utama, atau tampil terpisah
- Month selector tetap berlaku
- User ingin implementasi, bukan hanya laporan

## Depth

standard — audit kode + data + design, lalu implement.

## Angles (research)

1. **Current implementation** — apa yang dirender tab Transaksi sekarang (ledgerLines, filter, kolom)
2. **Data inventory** — transaksi di DB: real vs backlog vs future; IN vs OUT; field apa yang tersedia
3. **Non-overlap** — apa yang sudah dicakup Matriks & Per Siswa, apa yang belum ada di mana pun
4. **Proper ledger UX** — struktur kolom / perilaku filter yang benar untuk buku kas kelas
