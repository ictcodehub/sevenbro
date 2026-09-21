# SESSION_SYNC — Otak Bersama Semua Session

> **Wajib dibaca** setiap session di project sevenbro (Hand Off Start Project, Dev Session #2, Wrap to Native APK, dll.).
> File ini adalah **jembatan otak** antar session: definisi + keputusan produk + cara tetap 1 kata.

---

## 1. Apa yang “saling paham”

| Sumber | Status |
|--------|--------|
| File workspace (`D:\Workspace\sevenbro`) | **Shared** — semua session baca/tulis file sama |
| `AGENTS.md` + `docs/*` | **Shared brain** — baca sebelum kerja |
| Git + CodeGraph | **Shared history** — cek commit terakhir + `codegraph status` |
| Memory project (MEMORY.md) | **Shared** kalau agent nulis ke sana |
| Chat/session lain | **Tidak otomatis** — harus baca docs / handoff |

**Rule:** keputusan produk JANGAN hanya ada di chat session. Tulis ke `docs/` atau `SESSION_SYNC.md` bagian **Keputusan**, lalu commit.

---

## 2. Protokol wajib (semua session)

### Mulai session (dari mana pun)

1. Baca `AGENTS.md`
2. Baca `docs/SESSION_SYNC.md` (file ini)
3. Baca `docs/PROGRESS.md`
4. `git log -5 --oneline` + `git status`
5. Kerja → update docs + **UPDATE BAGIAN 3 di file ini**

### Setelah keputusan / fitur selesai

1. Update `docs/PROGRESS.md` / `ROLE_UI.md` / `POINT_SYSTEM.md` sesuai bidang
2. Update **3. Keputusan sinkron** di bawah (tambah baris: tanggal · keputusan · session)
3. `codegraph sync` jika ubah kode besar
4. Commit dengan prefix: `feat|fix|docs|style(scope): …`
5. Push/deploy **hanya jika user suruh** (lihat AGENTS.md § Git)

### Cek cepat otak bersama

```bash
node scripts/session-brain.mjs
```

Output: branch, commit terakhir, dirty files, ringkasan docs utama.

---

## 3. Keputusan sinkron (sumber kebenaran lintas session)

| Tanggal | Keputusan | Dampak |
|---------|-----------|--------|
| 2026-09-17 | Homeroom = super admin; Info/Agenda **disabled untuk murid** sampai dibuka lagi | Policy + nav + PAGE_ROLES |
| 2026-09-17 | Kas read-only semua siswa; manage hanya Homeroom + Bendahara | `canManageKas` / `canViewKas` |
| 2026-09-17 | Mass Report: Ketua buat → vote YES/NO (≥10 vote) → Homeroom review | Tab Report di Poin |
| 2026-09-17 | Custom report: draft Ketua; deskripsi final = edit Homeroom → preset | `report_presets` |
| 2026-09-17 | Pelapor & target **tidak vote** | API + modal |
| 2026-09-17 | Point awal kelas: **25 poin/siswa** | Reset data pakai seed ini |
| 2026-09-17 | UI **Install App / banner PWA dihapus** — install lewat menu browser | Tidak ada tombol install di app |
| 2026-09-17 | Commit/push/deploy **hanya kalau user suruh** | `AGENTS.md` § Git |
| 2026-09-17 | Nama UI: `formatDisplayName` (FULL CAPS → Title Case); role: `formatRoleLabel` | `src/lib/format.ts`, `roles.ts` |
| 2026-09-17 | Android shell: konten selalu **prod** `https://sevenbro.vercel.app` | `android/`, AGENTS.md |
| 2026-09-18 | Session-sync **wajib** di awal session: `npm run session:sync` + baca `SESSION_SYNC.md` | AGENTS.md, CLAUDE.md, scripts |
| 2026-09-18 | Empty notifikasi = animated **WebP transparan** (bukan GIF/SVG mailbox) | `public/notif-empty.webp`, `AppShell.tsx` |
| 2026-09-18 | Spec Info brief ala Freissy ditulis — **status superseded**: fase 1 **sudah live** (lihat baris 2026-09-18 migration 010 + `INFO_BRIEF_SPEC` header) | `docs/INFO_BRIEF_SPEC.md` |
| 2026-09-18 | Keputusan brief: Sekretaris post · siswa view Info+Agenda · mapel xlsx+Pramuka · seragam Sailor/Batik/Pramuka · 1 brief/hari · salin WA ada | `INFO_BRIEF_SPEC.md` §0 |
| 2026-09-18 | **Form row pattern FINAL** jadi SSOT desain section form/brief | `DESIGN_SYSTEM.md` § Form row pattern |
| 2026-09-18 | Guru mapel = tabel `subject_teachers` (migration 011); Homeroom ubah di Pengaturan Kelas | API subject-teachers + settings UI |
| 2026-09-18 | Seragam brief **auto per hari** + P.E di Jumat; mapel form fallback lokal; **migration 010 sudah di-push** | `info-brief.ts`, `InfoBriefForm.tsx` |
| 2026-09-19 | Notif hapus = **soft-delete server** (`deleted_at`); install ulang tidak memunculkan lagi; Riwayat bisa pulihkan | migration 016, `/api/notifications*`, layout + history |
| 2026-09-19 | Hapus Info → notif ikut hilang: FK `ref_id` cascade + fallback judul/body | migration 016, `announcements/[id]` |
| 2026-09-19 | **Commit `90d6c0c` push + `supabase db push` 016 + `vercel deploy --prod` selesai** | prod `sevenbro.vercel.app` |
| 2026-09-19 | Gap bawah form/nav: Sheet fullHeight **wajib** height calc dvh (bukan `h-full`); AppShell `fixed inset-0`; var `--sevenbro-safe-bottom` | `sheet.tsx`, `AppShell.tsx`, `globals.css`, shell inject |
| 2026-09-19 | **`bc3a379` push + Vercel deploy + APK shell 1.1.0 (vc 11) selesai** | gap fix live di prod + dist APK |
| 2026-09-19 | Sheet **semua** (fullHeight + bottom) pakai `absolute` positioning; audit overlay lain (buku detail, report, vote modal) | `sheet.tsx` + pages |
| 2026-09-19 | Session selamat uninstall→install: `allowBackup=true` + JWT cookie 30 hari di WebView CookieManager (bukan bug login bypass) | `AndroidManifest.xml`, `auth.ts` |
| 2026-09-19 | **`allowBackup` TETAP `true`** — user pilih session selamat reinstall; jangan dimatikan | `AndroidManifest.xml` |
| 2026-09-19 | **`4fdd07f` sheet absolute push + Vercel deploy** · otak bersama di-update (SESSION_SYNC §5, PROGRESS, project MEMORY) | prod live; session lain baca brain |
| 2026-09-19 | **Doc cleanup:** hapus `TODO` `TAKEOVER` `PROMPT-HERMES` `UX_PATTERNS` `.hermes/` · dev = **MiMo only** (Hermes off) · global AGENTS = pointer · SSOT = AGENTS + docs/* + android/README | jangan bikin file status/handoff ganda |
| 2026-09-19 | **`/deploy-it` skill** (`.mimocode/skills/deploy-it/`): sync docs+MEMORY → codegraph → quality gate → commit → push → Vercel · **`= izin eksplisit`** | AGENTS § Git; user tidak perlu ketik perintah terpisah |
| 2026-09-19 | Sheet **portal `document.body`** — fixed di dalam main/AppShell masih bikin gap Agenda (nav bocor); semua Sheet lewat `createPortal` | `sheet.tsx`, DESIGN_SYSTEM § safe area |
| 2026-09-19 | Agenda **+Tambah** disamakan dengan Info **+Umum**: `fullHeight` + input forest + tombol `rounded-full` | `agenda/page.tsx` |
| 2026-09-19 | **`aff8856` push + Vercel deploy** Sheet portal + Agenda=Umum · otak bersama di-update | prod `sevenbro.vercel.app` |
| 2026-09-19 | Batch UI: Beri Poin form+multi siswa · notif 1-baris hard-delete · Agenda timeline+deskripsi · Beranda accent float/shine · brief header · brand anim fix | pages + `StudentSelect` + `globals.css` + APIs |
| 2026-09-19 | **`0af39a4` push + Vercel deploy** batch UI · otak bersama di-update | prod `sevenbro.vercel.app` |
| 2026-09-19 | **i18n ID/EN** — `locales.ts` + `I18nProvider` + section Bahasa di Pengaturan · leaderboard icon TrendingUp/Down · score chip redesign | `src/lib/i18n.tsx`, `locales.ts`, settings, poin |
| 2026-09-19 | **`f83273e` push + Vercel deploy** i18n + icons · otak bersama di-update | prod `sevenbro.vercel.app` |
| 2026-09-20 | **Tipografi SSOT Android/Material 3** — body ≥14px · meta ≥12px · micro floor 11px · larangan `text-[7–9px]`; token `--text-micro/meta/body/title` di `@theme` | `DESIGN_SYSTEM.md` § Tipografi · `globals.css` |
| 2026-09-20 | Rollout tipografi fase 1: **Beranda + Kas (+ Buku Kas) + ui-primitives + sheet input** sudah naik skala; area lain menyusul | `page.tsx`, `kas/*`, `ui-primitives.tsx`, `sheet.tsx` |
| 2026-09-20 | Rollout tipografi **fase 2**: Brief form + Mass Report + Buat Report + Pengumuman — body/tombol `text-sm`, meta `text-xs`, micro floor 11px | `InfoBriefForm`, `MassReport*`, `report/new`, `pengumuman` |
| 2026-09-20 | Rollout tipografi **fase 3 (selesai seluruh app)**: Poin/Arena, Agenda, Settings, roster, scan, AppShell, login, admin — **0** sisa `text-[7–10px]` di `src/` | pages + `AppShell` + admin components |
| 2026-09-21 | Poin: angka arena leaderboard `text-[14px]` (dari 12px), label `pts` `text-[9px]` lowercase tanpa uppercase | `poin/page.tsx` |
| 2026-09-21 | **Tipografi M3 diturunkan ~1px** — body 13 / meta 11 / micro 10 / title 17; override `text-xs/sm/base/lg` di `@theme`; Kas: badge sejajar + anti overflow card | `globals.css` · `DESIGN_SYSTEM.md` § Tipografi · `kas/page.tsx` |
| 2026-09-21 | **Hierarki tipografi final** — judul `text-sm` bold · body `text-sm-plus` (12) regular · meta `text-xs`/`[11px]`; diterapkan lintas app | `DESIGN_SYSTEM.md` · pages + `ui-primitives` |
| 2026-09-21 | **Density SSOT lintas halaman** — list/preview `text-xs` (ListRow, TimelineItem, judul+WaBody pengumuman, podium nama); section heading tetap `text-sm` | `DESIGN_SYSTEM.md` § Tipografi · `ui-primitives` · `pengumuman` · `page.tsx` · `poin` |

---

## 4. Peta fitur → file kunci

| Fitur | File kunci |
|-------|------------|
| Policy role | `src/lib/policies.ts` + tests |
| Nav / shell | `src/app/app/layout.tsx`, `src/components/AppShell.tsx` |
| Kas | `src/app/app/kas/**`, `src/app/api/kas/**` |
| Poin / Mass Report | `src/app/app/poin/page.tsx`, `src/components/MassReport*.tsx`, `src/app/api/mass-reports/**` |
| Notif | `src/lib/notify.ts`, `src/lib/notif-nav.ts`, `src/app/api/notifications`, empty icon `AppShell.tsx` + `public/notif-empty.webp` |
| Info brief | `docs/INFO_BRIEF_SPEC.md` · `src/lib/info-brief.ts` · `InfoBriefForm.tsx` · `/api/info-briefs` · `/api/subjects` · migration `010` |
| Roster + usulan | `src/app/app/admin/roster`, `src/app/api/admin/roster-proposals` |
| Android | `android/` + `android/README.md` |

---

## 5. Open yang harus disinkronkan bila dikerjakan

**SSOT open items = `docs/PROGRESS.md` § Open** (jangan daftar ulang di sini).

Setelah kerja selesai: update `PROGRESS.md` Open + baris **Keputusan sinkron** di §3.

---

## 6. Bila session lain “beda otak”

1. Minta mereka baca file ini + `PROGRESS.md`
2. Jalan `node scripts/session-brain.mjs`
3. Jangan ulangi pekerjaan yang sudah di commit — cek `git log`




























### Automation log
- last session-sync: `2026-09-21T04:49:54.271Z` · branch `master`
