# Seven Bro! — Progress Snapshot (Beta)

> Status terakhir: Gap bawah form/nav fixed — **pushed `bc3a379` + Vercel deployed + APK 1.1.0 built** (2026-09-19).

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
- **Soft-delete server** (`deleted_at`, migration 016): hapus dari shade = sembunyi permanen lintas install; Riwayat tetap bisa **Pulihkan**
- Legacy localStorage `DELETED_KEY` di-migrasi sekali ke server saat load
- Hapus Info: FK `ref_id` → `announcements` **ON DELETE CASCADE** + fallback cocok judul/body (baris lama tanpa ref)

### Role UI
- **Info & Agenda** default terbuka untuk siswa; **Fitur Kelas** di Pengaturan kontrol on/off (class_settings)
- Toggle: Kas · Agenda · Poin · Info — Homeroom saja; murid nav disabled + FeatureGate
- Kas read-only semua siswa; manage Homeroom + Bendahara

### Info Brief (Sekretaris)
- Spec: `docs/INFO_BRIEF_SPEC.md`
- Form **Brief Harian**: tanggal, seragam, mapel+JP, piket roster, tugas/membawa, pin, **Salin teks WA**
- Schema: `subjects` + `daily_briefs` (migration 010 **sudah push** ke Supabase); 1 brief DAILY per tanggal
- Pelajaran **auto dari jadwal KBM 7B** (tabel JP · Time · Mapel · Guru; Mapel merge sesi beruntun)
- Form Tugas/Remedial: mapel + siswa multi + deskripsi opsional; `+ Add` di bawah saja
- **Design system:** form row pattern FINAL di `docs/DESIGN_SYSTEM.md` § Form row pattern
- **Guru mapel** di DB `subject_teachers` — Homeroom edit di Pengaturan Kelas → Guru Mapel; form brief baca DB
- Seragam **otomatis per hari** (Sen–Kam Sailor/Batik, Jumat Pramuka + accessories + Bawa Seragam P.E); custom opsional
- Judul brief fix: `Info Harian - {Hari, tgl bln tahun}`
- Brief hanya **hari sekolah**; Minggu → default Senin
- API: `/api/subjects`, `/api/info-briefs`; notif ke Homeroom + siswa
- Policy create tetap `canPostAnnouncement` (Sekretaris utama)

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
- Package `com.sevenbro.app` · versi shell **1.1.0** (versionCode 11)
- FCM push + `getFcmToken` bridge · cookie flush untuk persist login
- Ikon: `pixel-duck.png` HD · bg putih · safe-zone circle · nama **Seven BRO!**
- **Update konten = deploy Vercel saja**; APK rebuild hanya untuk perubahan native
- Full-screen tanpa address bar Chrome; pull-to-refresh; back = history WebView
- Scale match Chrome: `loadWithOverviewMode=false`, `textZoom=100` (anti downscale)
- **System bars (Xiaomi-safe):** `decorFitsSystemWindows(false)` + padding **native** di root layout (bukan inject px ke CSS WebView)
- Status/nav bar + ikon adaptif light/dark via bridge `SevenBroShell.setChrome(dark)`
- Web CSS var `--sevenbro-status-bar-inset` / `--sevenbro-nav-bar-inset` / `--sevenbro-safe-bottom` di-set `0` oleh shell (anti double-pad)
- **Gap bawah form:** Sheet fullHeight pakai `calc(100dvh - inset)` (bukan `h-full`); AppShell `fixed inset-0`; WebView bg = nav (putih)
- File picker + kamera (Mass Report); FileProvider
- OAuth tetap di WebView (cookies tidak pindah ke Chrome Custom Tab)
- Signing: `android/keystore.properties` + keystore lokal (**gitignored**)
- Build/install: lihat `android/README.md`
- APK distribusi: `android/dist/SevenBro-1.0.5-release.apk` (tidak di-commit)

### Cache
- SWR localStorage + PWA NetworkFirst `/api/*`
- Logout bersihkan cache

### Migrations
005 roster_proposals · 006 notifications · 007 mass_reports · 008 custom+photo · 009 vote YES/NO · 010 info_brief · 011 subject_teachers · 012 subject_name_ict · 013 class_settings · 014 push_tokens · **016 notif soft-delete + ref_id cascade**

### Push Notification (FCM)
- Spec: `docs/PUSH_NOTIFICATIONS.md`
- DB `push_tokens` (014) · API `/api/push/register` · `notify.ts` kirim FCM bila `FCM_SERVER_KEY` ada
- Android stub: `SevenBroFirebaseMessagingService` + `getFcmToken` bridge + permission
- **Belum aktif end-to-end** sampai: env key + `google-services.json` + rebuild APK

## Open
- Web-push server (VAPID)
- Persist toggle offline ke SW
- Agenda lampau
- Checklist piket (A4/B3) — belum link dari brief
- Auto −1 kas mingguan + izin 3× beruntun
- Android shell: QA login Google + foto report + dark mode di device fisik
- Distribusi APK ke siswa (sideload; Play Store closed testing = opsional hilangkan warning Play Protect)

## Deploy
- https://sevenbro.vercel.app — **deployed 2026-09-19** (`bc3a379` gap fix; sebelumnya `90d6c0c` notif)
- Supabase `gdmqmoigudtgknkgomeu` — migrations 003–014, **016 applied**
- Redirect Google: prod `…/api/auth/callback/google` + localhost (opsional)
- Android shell **1.1.0** (versionCode 11) — `android/dist/SevenBro-1.1.0-release.apk` (tidak di-commit)

## Stack
Next.js 15 · React 19 · Tailwind 4 · next-auth v4 · Supabase · SWR · Vitest · Android Kotlin WebView shell
