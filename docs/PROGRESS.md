# Seven Bro! — Progress Snapshot (Beta)

> Status per commit ini. Info & Agenda masih dalam pengerjaan.

## Selesai

### Auth & Role
- Login Google `@mutiarabangsa.sch.id`
- Role efektif: Homeroom, Teacher, Ketua, Bendahara, Sekretaris, Anggota, Pending
- RoleGate client + policy API (`canAdmin`, `canManageKas`, `canGivePoints`)
- TEACHER dibatasi ke `/app/scan` (Beri Poin via QR)

### Kas
- Setoran harian Rp 2.000/orang (Selasa & Kamis), checklist Bayar/Izin eksklusif
- Izin harian (`kas_izin`) + tunggak kumulatif semester
- Bayar Khusus & Pengeluaran (kartu di samping Saldo)
- Buku Kas: tab Transaksi / Per Siswa / Matriks; filter per bulan
- Nominal format `Rp. …`

### Poin (Arena)
- Arena gamified: podium, Leaderboard, Battle Log, Kejar Podium
- Form Beri Poin (Homeroom/Teacher) + scan mode untuk guru
- QR Beri Poin (ikon di header arena, Homeroom saja)

### Notifikasi
- Shade iOS-style, slide dari atas, palette white-green
- Swipe-to-delete, tandai dibaca, riwayat + pulihkan (`/app/notifications`)
- Badge lonceng (unread count), sinkron localStorage + custom event
- Quick actions di shade: Push / Mode Gelap / Hemat Data

### Pengaturan
- Toggle tersimpan di localStorage (`sevenbro:settings-prefs`)
- Mode Gelap: class `.dark`, token grey netral, kontras forest di dark
- Push: minta izin Notification API + notifikasi tes (on-device, bukan web-push server)
- Riwayat Notifikasi diakses dari Pengaturan

### Roster (Homeroom)
- Tambah siswa bulk, daftarkan guru, tautkan akun pending
- Ubah posisi, aktif/nonaktif siswa
- **Edit data siswa** (nama, email, NIS) & **edit data guru** (nama, email) via sheet
- Hapus guru

### Copy / Bahasa
- Audit UI: formal Indonesia + Title Case
- Pertahankan istilah produk yang sudah pas: Leaderboard, Battle Log, Kejar Podium, Scan Mode
- Ganti slang: Kasih Poin → Beri Poin, kamu → Anda, utang → tunggak, dll.

## Desain
- SSOT: `docs/DESIGN_SYSTEM.md`, `docs/ROLE_UI.md`
- Token: page mint, card putih, forest/lime/amber
- Dark mode: page `#0b0f14`, card `#151b23`, text-forest `#6ee7b7`

## Belum / Open
- **Info (Pengumuman) & Agenda** — belum final
- Web-push server (VAPID) belum; sekarang Notification API lokal
- Persist toggle offline ke service worker belum
- Deploy Vercel production URL + env
- Tunggak lintas bulan: asumsi Jul/Des ganjil & Jan/Genap genap

## Stack
Next.js 15 · React 19 · Tailwind 4 · next-auth v4 Google · Supabase · SWR · Vitest (116 tests)
