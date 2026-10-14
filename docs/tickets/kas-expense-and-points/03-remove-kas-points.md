# 03: Remove Point System on Kas Payment & DB Point Cleanup

**What to build:**
Hapus mekanisme penambahan poin otomatis saat siswa membayar uang kas (A1 di POINT_SYSTEM.md) untuk menutup celah *boost point* dari uang kas. Bersihkan seluruh 25 data riwayat poin "Bayar Uang Kas" yang sudah ada di database Supabase agar leaderboard adil.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Cabut pemanggilan `awardKasPoint` dari rute API `POST /api/kas/collect`
- [x] Cabut pemanggilan `awardKasPoint` dari rute API `POST /api/kas/transactions` (jalur Bayar Khusus)
- [x] Nonaktifkan/rapikan helper `src/lib/kas-points.ts`
- [x] Hapus seluruh 25 riwayat poin dengan reason `Bayar Uang Kas` di tabel `points` Supabase
- [x] Perbarui SSOT `docs/POINT_SYSTEM.md` menghapus faktor A1 (Bayar uang kas)
