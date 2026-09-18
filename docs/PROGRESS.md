# Seven Bro! — Progress Snapshot (Beta)

> Status terakhir: empty-state notif = animated WebP transparan + session-sync workflow ter-commit.

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
- Empty state ikon: animated **WebP transparan** `public/notif-empty.webp` (+ `notif-empty.png` fallback)
  - Source user: `notif.gif` — GIF putih di browser, diganti WebP alpha
  - Render: `AppShell.tsx` `MailIcon`, `h-14`, tanpa kartu putih

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
- Viewport `viewportFit: cover` (browser PWA)
- Bottom nav: `env(safe-area-inset-bottom)` untuk install PWA di browser

### Android WebView Shell (`android/`)
- Native Kotlin shell **remote URL** — bukan bundel web assets
- Loads `https://sevenbro.vercel.app` (`BuildConfig.APP_URL`)
- Package `com.sevenbro.app` · versi shell **1.0.5** (versionCode 6)
- **Update konten = deploy Vercel saja**; APK rebuild hanya untuk perubahan native
- Full-screen tanpa address bar Chrome; pull-to-refresh; back = history WebView
- Scale match Chrome: `loadWithOverviewMode=false`, `textZoom=100` (anti downscale)
- **System bars (Xiaomi-safe):** `decorFitsSystemWindows(false)` + padding **native** di root layout (bukan inject px ke CSS WebView)
- Status/nav bar + ikon adaptif light/dark via bridge `SevenBroShell.setChrome(dark)`
- Web CSS var `--sevenbro-status-bar-inset` / `--sevenbro-nav-bar-inset` di-set `0` oleh shell (anti double-pad)
- File picker + kamera (Mass Report); FileProvider
- OAuth tetap di WebView (cookies tidak pindah ke Chrome Custom Tab)
- Signing: `android/keystore.properties` + keystore lokal (**gitignored**)
- Build/install: lihat `android/README.md`
- APK distribusi: `android/dist/SevenBro-1.0.5-release.apk` (tidak di-commit)

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
- Android shell: QA login Google + foto report + dark mode di device fisik
- Distribusi APK ke siswa (sideload; Play Store closed testing = opsional hilangkan warning Play Protect)

## Deploy
- https://sevenbro.vercel.app
- Supabase `gdmqmoigudtgknkgomeu` — migrations 003–009
- Redirect Google: prod `…/api/auth/callback/google` + localhost (opsional)
- Android shell: `vercel deploy --prod` untuk konten; APK di `android/dist/`

## Stack
Next.js 15 · React 19 · Tailwind 4 · next-auth v4 · Supabase · SWR · Vitest · Android Kotlin WebView shell
