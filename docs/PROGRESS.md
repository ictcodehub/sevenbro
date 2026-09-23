# Seven Bro! — Progress Snapshot (Beta)

> Status terakhir: **Badge verified SSOT global + posisi dinamis + session auto-sync role (24 jam/window focus) · 2026-09-23** · sebelumnya login allowlist + Roster whitelist UI `f139c6e` · kas backlog+backdate `7f5a536` · APK 1.1.0; `allowBackup` tetap `true`.

## Selesai

### Auth & Role
- Login Google `@mutiarabangsa.sch.id`
- **Login allowlist:** selain siswa aktif / teachers / homeroom, hanya email di `login_allowlist` yang boleh sign-in · kelola di **Roster → Whitelist Akses Login** (Homeroom) · migration **017**
- Role: Homeroom, Teacher, Ketua, Bendahara, Sekretaris, Anggota, Pending
- **Posisi siswa 100% dinamis** — bebas teks (validasi format saja, max 32), role efektif = posisi itu sendiri; label Title Case generik
- **Badge verified SSOT** (`VerifiedBadge.tsx` + `usePositions`) — tampil di semua halaman penyaji nama siswa; topi = `students.position`; Ketua emas · Bendahara hijau · Sekretaris biru · posisi lain auto-warna · Anggota tanpa badge
- **Session auto-sync role**: JWT cek DB saat window focus (gate 24 jam) — ganti pengurus tanpa login ulang; server tetap fresh per-request
- RoleGate + `policies.ts`; TEACHER hanya `/app/scan`
- Session JWT 30 hari · **`allowBackup=true` tetap ON** (session selamat uninstall→install; user decision 2026-09-19)

### Kas
- Setoran Sel/Kam Rp 1.000 (2×/minggu = Rp 2.000); Bayar Khusus; Pengeluaran; Izin
- **Anchor periode = Selasa 4 Agu 2026** (keputusan user; `TERM_START` di `/api/kas/tunggak`) — checklist bendahara sumber kebenaran
- **Backlog checklist dikoreksi** (2026-09-22): 19 tx "Iuran khusus" 21 Sep → 291 baris Rp 1.000/hari Sel/Kam sesuai checklist; kelebihan = bayar di muka mengalir ke Sel/Kam berikutnya (`scripts/fix-kas-backlog.mjs`, backup `scripts/backup-kas-2026-09-21.json`)
- **Backdate**: semua input kas bisa pilih tanggal (header checklist + sheet Khusus/Pengeluaran; izin ikut tanggal); `/api/kas/collect` terima `occurred_on` (tolak masa depan)
- Matriks: lunas = jumlah hari Sel/Kam sejak anchor (dinamis); sel 0/1/2 per minggu; filter bulan dihormati; kolom **No**
- Buku Kas UI: Per Siswa table proporsional · Transaksi card hijau + date `DD Mon` + frame kolom · filter bar card seragam · tanpa search ledger
- StudentMultiSelect: label i18n (EN “All students”) + default **select all**
- Tunggak kumulatif dari anchor; tetap dihitung walau data kas kosong (kalender setoran)

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
- Student list = tabel clean (No · Nama · Position · toggle Aktif) + frame ala Info; tap nama → modal (ubah posisi + edit + hapus); Allowlist pecah ke `/app/admin/whitelist`

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
- **Gap bawah form/nav:** Sheet fullHeight **dan** bottom-sheet pakai `absolute` + `calc(100dvh - inset)` (bukan `h-full`/`items-end`); AppShell `fixed inset-0`; WebView bg = nav (putih)
- Overlay lain: Buku Kas detail pb-safe · report/new `min-h-full` · vote modal `max-h` dvh
- File picker + kamera (Mass Report); FileProvider
- OAuth tetap di WebView (cookies tidak pindah ke Chrome Custom Tab)
- Signing: `android/keystore.properties` + keystore lokal (**gitignored**)
- Build/install: lihat `android/README.md`
- APK distribusi: `android/dist/SevenBro-1.1.0-release.apk` (tidak di-commit)

### Cache
- SWR localStorage + PWA NetworkFirst `/api/*`
- Logout bersihkan cache

### Migrations
005 roster_proposals · 006 notifications · 007 mass_reports · 008 custom+photo · 009 vote YES/NO · 010 info_brief · 011 subject_teachers · 012 subject_name_ict · 013 class_settings · 014 push_tokens · **016 notif soft-delete + ref_id cascade** · **017 login_allowlist** (applied 2026-09-22)

### Push Notification (FCM)
- Spec: `docs/PUSH_NOTIFICATIONS.md`
- DB `push_tokens` (014 **applied**) · API `/api/push/register` · `notify.ts` → `push-fcm.ts`
- Env utama (Vercel Production **sudah di-set**): `FIREBASE_PROJECT_ID` · `FIREBASE_CLIENT_EMAIL` · `FIREBASE_PRIVATE_KEY` (HTTP v1); legacy `FCM_SERVER_KEY` opsional
- Android: `SevenBroFirebaseMessagingService` + `getFcmToken` bridge + permission
- **Open:** QA push end-to-end di device (`google-services.json` lokal + APK 1.1.0)

## Open
- Web-push server (VAPID)
- Persist toggle offline ke SW
- Agenda lampau
- Checklist piket (A4/B3) — belum link dari brief
- Auto −1 kas mingguan + izin 3× beruntun
- Android shell: QA login Google + foto report + dark mode + **gap bottom sheet di device** (portal Sheet + fullHeight Agenda sudah di-fix; perlu QA device)
- Distribusi APK **1.1.0** ke siswa (sideload; Play Store closed testing = opsional hilangkan warning Play Protect)
- Aktivasi FCM end-to-end di device (env Vercel sudah ada)
- ~~Tipografi rollout~~ **selesai f1–f3 + hierarchy pass** — SSOT: judul `text-sm` bold · body `text-sm-plus` (12) · meta 11 · micro 10; token `--text-sm-plus` di `@theme`; audit: **0** `text-[7–9px]` · Kas badge sejajar + anti overflow
- **Login allowlist live** (migration 017 applied + deploy) — jangan diulang
- **Badge verified global + posisi dinamis + session auto-sync** — selesai 2026-09-23, jangan diulang

**Sudah selesai (jangan diulang):** migration 010–014 + **016** · notif soft-delete · gap Sheet absolute · **Sheet portal body** · Agenda form = Info Umum · **notif hard-delete + 1-baris** · **Agenda timeline + deskripsi** · **Beri Poin multi-siswa + section card** · **StudentSelect SSOT** · **i18n ID/EN + Settings Bahasa** · APK 1.1.0 build · Vercel `f83273e` · **Tipografi SSOT M3 + rollout f1–f3 seluruh app** · **Badge verified SSOT global + posisi dinamis**

## Deploy
- https://sevenbro.vercel.app — **deployed 2026-09-22** (`f139c6e` login allowlist + migration **017** · sebelumnya `7f5a536` kas backlog+backdate + Buku Kas UI, `c3e92e2` nominal Rp 1.000, `8799657` tipografi hierarchy, `cd352cf` poin arena, `a7cf598` tipografi M3, `f83273e`, `0af39a4`, `aff8856`, `4fdd07f`, `bc3a379`, `90d6c0c`)
- Supabase `gdmqmoigudtgknkgomeu` — migrations 003–014, 016, **017 applied** (2026-09-22)
- Redirect Google: prod `…/api/auth/callback/google` + localhost (opsional)
- Android shell **1.1.0** (versionCode 11) — `android/dist/SevenBro-1.1.0-release.apk` (tidak di-commit)
- **`allowBackup=true` tetap ON** (keputusan user: session selamat reinstall)

## Stack
Next.js 15 · React 19 · Tailwind 4 · next-auth v4 · Supabase · SWR · Vitest · Android Kotlin WebView shell
