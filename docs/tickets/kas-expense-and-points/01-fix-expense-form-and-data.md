# 01: Fix Expense Form & Database Correction

**What to build:**
Perbaiki form Pengeluaran di menu Kas agar nominal yang diinput Bendahara (seperti `30.000` atau `30000`) diproses dengan benar tanpa terpotong desimal. Sediakan chips nominal cepat (10k, 20k, 30k, 50k, 100k), live preview Rupiah, dan proteksi anti-double submit. Lakukan koreksi data di Supabase untuk transaksi belanja tissue Mishella menjadi Rp 30.000 tunggal.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Ganti input nominal form Pengeluaran menjadi pembersihan non-digit (`replace(/\D/g, "")`)
- [x] Tambahkan quick chips nominal (10k, 20k, 30k, 50k, 100k) dan preview format Rupiah
- [x] Tambahkan synchronous ref lock (`savingOutRef`) pada handler simpan Pengeluaran
- [x] Update data transaksi belanja tissue di DB: ubah `7748330c-4cbd-4039-8292-d5b4980f81d0` menjadi Rp 30.000 dan hapus duplikat `81749563-29a4-4b8d-a3af-1ce7f1355c89`
