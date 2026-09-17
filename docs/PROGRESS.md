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

### Info (Pengumuman)
- CRUD: buat, ubah (judul/isi/sematan), sematkan, hapus
- Expand “Baca selengkapnya”, author name (bukan email)
- Policy: Homeroom & Ketua

### Agenda
- CRUD + edit (judul, lokasi, waktu) via API PATCH
- Label Hari Ini / Besok, jam di chip forest
- Policy: Homeroom, Ketua, Sekretaris

### Copy / Bahasa
- Audit UI: formal Indonesia + Title Case
- Pertahankan istilah produk yang sudah pas: Leaderboard, Battle Log, Kejar Podium, Scan Mode
- Ganti slang: Kasih Poin → Beri Poin, kamu → Anda, utang → tunggak, dll.

### Role-Based UI (Pengurus)
- Homeroom = super admin (union semua policy manage + admin)
- Menu siswa: Beranda · Kas · Poin — **Info & Agenda disabled untuk murid** (hanya Homeroom aktif)
- Bendahara: manage Kas penuh (setoran, bayar khusus, pengeluaran, izin, Buku Kas)
- Ketua & Sekretaris: manage Info + Agenda **saat fitur dibuka lagi**
- Anggota & pengurus non-manage: Kas/Buku Kas read-only + status iuran pribadi
- Label role Title Case Indonesia di profil (`formatRoleLabel`)
- SSOT: `docs/ROLE_UI.md`

### Roster Approval (Ketua → Homeroom)
- Ketua: lihat roster + usul tambah/edit/hapus/posisi (tidak langsung mutasi)
- Homeroom: approve/reject usulan di halaman Roster
- Tabel `roster_proposals` (migration 005)
- API: `/api/admin/roster-proposals` GET/POST + `[id]` POST decision

### Point System (draft → eksekusi bertahap)
- SSOT: `docs/POINT_SYSTEM.md`
- Preset alasan di form Beri Poin (Prestasi / Pelanggaran)
- Auto +1 “Bayar Uang Kas” saat setoran (maks 1×/siswa/hari)
- Open: piket, Mass Report, auto −1 kas mingguan

### Notifikasi Server
- Tabel `notifications` (migration 006) — audience HOMEROOM / email
- Homeroom dapat notif: usulan roster, Info/Agenda baru dari pengurus, setoran & transaksi kas
- Ketua dapat notif saat usulan disetujui/ditolak
- Shade + riwayat pakai `/api/notifications` (bukan demo data)

### Cache & Nama
- `formatDisplayName` — FULL CAPS → Title Case (display UI semua nama orang)
- SWR localStorage cache (`sevenbro:swr-cache`) — buka halaman: cache dulu, revalidate
- PWA runtime caching: static assets + pages + `/api/*` NetworkFirst
- Logout bersihkan cache SWR + `api-data`

## Desain
- SSOT: `docs/DESIGN_SYSTEM.md`, `docs/ROLE_UI.md`
- Token: page mint, card putih, forest/lime/amber
- Dark mode: page `#0b0f14`, card `#151b23`, text-forest `#6ee7b7`

## Belum / Open
- Web-push server (VAPID) belum; sekarang Notification API lokal
- Persist toggle offline ke service worker belum
- Agenda lampau (API hanya kirim mendatang)
- Tunggak lintas bulan: asumsi Jul/Des ganjil & Jan/Genap genap

## Deploy (Beta)
- GitHub: `ictcodehub/sevenbro` master `07054e0+`
- Vercel: https://sevenbro.vercel.app
- Supabase: `gdmqmoigudtgknkgomeu` (migrations 003/004 applied)
- **Wajib**: Google Console → Authorized redirect URI
  `https://sevenbro.vercel.app/api/auth/callback/google`

## Stack
Next.js 15 · React 19 · Tailwind 4 · next-auth v4 Google · Supabase · SWR · Vitest (116 tests)
