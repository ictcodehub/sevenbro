# Seven Bro! — Progress Snapshot (Beta)

> Status terakhir setelah commit docs/UI Mass Report & shell.

## Selesai

### Auth & Role
- Login Google `@mutiarabangsa.sch.id`
- Role: Homeroom, Teacher, Ketua, Bendahara, Sekretaris, Anggota, Pending
- RoleGate + `policies.ts`; TEACHER hanya `/app/scan`

### Kas
- Setoran Sel/Kam Rp 2.000; Bayar Khusus; Pengeluaran; Izin
- Tunggak kumulatif semester; Buku Kas (Transaksi / Per Siswa / Matriks, filter bulan)
- Tunggak tetap dihitung walau data kas kosong (kalender semester)

### Poin
- Arena: Leaderboard · Battle Log · **Report**
- Podium **muted** (abu, “—”) bila skor top masih seri
- Nama UI lengkap via `formatDisplayName`
- Preset Beri Poin; auto +1 Bayar Uang Kas (1×/siswa/hari)

### Mass Report
- Ketua: **Buat Report** dari menu profil → `/app/report/new`
- Preset + Custom + foto bukti (kompres → DB)
- Vote **YES/NO** modal global; pelapor/target tidak vote
- Threshold **≥10 vote** → READY
- Homeroom: review + edit deskripsi custom → `report_presets`
- Detail pemilih (No | Nama | Votes); riwayat tabel + tanggal
- Notif: siswa saat report dibuka; hasil vote ke pemilih

### Roster
- Homeroom mutasi + review usulan Ketua (`roster_proposals`, migration 005)

### Notifikasi
- Server table (006); API `/api/notifications`
- Tap → navigasi + hapus dari shade; **Hapus Semua**
- pathForNotification: report / roster / info / agenda / kas

### Role UI
- **Info & Agenda disabled untuk murid** (homeroom only sampai dibuka lagi)
- Nav item disabled (abu); Beranda hanya tampilkan info/agenda untuk Homeroom
- Kas read-only semua siswa; manage Homeroom + Bendahara

### Branding & PWA
- Header: logo duck + **Seven Bro!** (Brocklyns + “!” font sistem) + caption Chillin on Sunday
- Ikon PWA/favicon duck (purpose any + maskable)
- **UI install banner/tombol dihapus** — user install lewat menu browser
- Google OAuth: `prompt=select_account`
- QR scan: origin asli di prod; `NEXT_PUBLIC_APP_URL` hanya untuk localhost

### Cache
- SWR localStorage + PWA NetworkFirst `/api/*`
- Logout bersihkan cache

### Migrations
005 roster_proposals · 006 notifications · 007 mass_reports · 008 custom+photo · 009 vote YES/NO

## Open
- Web-push server (VAPID)
- Persist toggle offline ke SW
- Agenda lampau
- Checklist piket (A4/B3)
- Auto −1 kas mingguan + izin 3× beruntun
- Buka kembali Info/Agenda untuk murid (policy + nav + PAGE_ROLES)

## Deploy
- https://sevenbro.vercel.app
- Supabase `gdmqmoigudtgknkgomeu` — migrations 003–009
- Redirect Google: prod `…/api/auth/callback/google` + localhost (opsional)

## Stack
Next.js 15 · React 19 · Tailwind 4 · next-auth v4 · Supabase · SWR · Vitest
