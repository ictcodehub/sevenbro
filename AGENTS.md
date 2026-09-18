# AGENTS.md — Seven Bro!

> **Baca file ini dulu** sebelum mengubah apa pun.
> Panduan wajib untuk AI agent (MiMo, Claude Code, Cursor, dll.) di repo ini.

---

## 1. Project

**Seven Bro!** — PWA manajemen kelas 7B (Mutiara Bangsa 2 JHS): Kas, Pengumuman (Info), Agenda, Poin. Plus **Android WebView shell** (`android/`) yang wrap PWA remote.

| | |
|---|---|
| Stack | Next.js 15 App Router · React 19 · Tailwind 4 · next-auth v4 (Google) · Supabase · SWR · Vitest · Android Kotlin WebView |
| Repo | `https://github.com/ictcodehub/sevenbro` |
| Prod (beta) | `https://sevenbro.vercel.app` |
| Supabase | project `gdmqmoigudtgknkgomeu` |
| Homeroom | Tio (super admin) |
| Android shell | `com.sevenbro.app` · docs `android/README.md` · konten selalu dari prod |

---

## 2. Dokumen wajib (urutan baca)

| Prioritas | File | Isi |
|---|---|---|
| 1 | **AGENTS.md** (ini) | Rules kerja, CodeGraph, bootstrap |
| 2 | **docs/SESSION_SYNC.md** | Otak bersama lintas session + keputusan sinkron |
| 3 | `docs/DESIGN_SYSTEM.md` | SSOT visual: warna, tipografi, spacing |
| 4 | `docs/ROLE_UI.md` | Matriks role → aksi UI |
| 5 | `docs/POINT_SYSTEM.md` | Faktor tambah/kurang poin + Mass Report |
| 6 | `docs/PROGRESS.md` | Snapshot selesai / open |

**Lintas session:** semua session di project ini share workspace. Chat session lain TIDAK otomatis. Wajib baca `SESSION_SYNC.md` di awal, dan update bagian **Keputusan sinkron** setelah keputusan produk. Cepat cek otak bersama:

```bash
node scripts/session-brain.mjs
```

### Automation session-sync (OTOMATIS)

Di **setiap session** (MiMo Desktop, Claude Code, Cursor, dll.), **sebelum kerja nyata**, jalankan:

```bash
node scripts/session-sync-workflow.mjs
# atau: npm run session:sync
```

Workflow lengkap: `docs/workflows/session-sync.md`  
Entry lintas tool: `CLAUDE.md` (pointer ke AGENTS.md).

Setelah keputusan produk / commit: update `docs/SESSION_SYNC.md` + `docs/PROGRESS.md`, lalu `codegraph sync` bila perlu.
| 5 | `src/lib/policies.ts` | SSOT policy server |
| 6 | `android/README.md` | Android shell build, system bars, update policy |

Jangan “invent” style atau role baru tanpa update dokumen di atas.

---

## 3. CodeGraph — WAJIB dipakai

Project ini **ter-index** dengan [CodeGraph](https://github.com/colbymchenry/codegraph) (knowledge graph lokal, 100% offline).

### Saat mulai sesi / lanjut di PC lain

```bash
# 1. Pastikan CLI ada (sekali per mesin)
npm i -g @colbymchenry/codegraph
# atau: irm https://raw.githubusercontent.com/colbymchenry/codegraph/main/install.ps1 | iex

# 2. Wire agent (sekali per mesin) — config MCP Claude Code / Cursor / dll.
codegraph install --yes

# 3. Bangun index project (sekali per clone / PC)
cd sevenbro
codegraph init

# 4. Cek sehat
codegraph status
```

`.codegraph/` **tidak di-commit** (SQLite lokal). Setiap mesin build ulang via `codegraph init`.

### Cara pakai saat development

| Kebutuhan | Perintah |
|---|---|
| “Bagaimana X bekerja?” / alur / survey area | MCP `codegraph_explore` **atau** `codegraph explore "..."` |
| Siapa yang memanggil symbol | `codegraph callers <symbol>` |
| Blast radius ubah symbol | `codegraph impact <symbol>` |
| Test yang terpengaruh file berubah | `codegraph affected <files>` |

**Rules agent:**
1. Untuk pertanyaan struktural / alur / “di mana logic X” → **pakai CodeGraph dulu**, jangan mulai dari grep massal.
2. Jangan sub-agent Explore file-by-file kalau `codegraph_explore` sudah cukup.
3. Hasil explore = source verbatim; **jangan Read ulang** file yang sudah disebut di payload, kecuali ada banner stale.
4. Setelah edit besar: `codegraph status` (auto-sync ~2s). Kalau pending, baca file langsung.
5. Agent tanpa MCP (mis. sesi lama / tool terbatas): gunakan CLI `codegraph explore` / `codegraph callers` via shell.

### Config yang sudah ditulis installer

- Claude Code: `~/.claude.json` (MCP `codegraph`) + `~/.claude/CLAUDE.md`
- Agent lain: lihat output `codegraph install` (opencode, Gemini, Copilot VS Code, dll.)

---

## 4. Bootstrap di PC lain

Jalankan berurutan (copy-paste):

```bash
git clone https://github.com/ictcodehub/sevenbro.git && cd sevenbro && npm install
# salin .env.local dari PC lama (JANGAN commit) — format di §5
npm i -g @colbymchenry/codegraph && codegraph install --yes
codegraph init
```

Lalu:

```bash
npm run dev   # http://localhost:3000
codegraph status
```

Checklist:
```text
[ ] clone + npm install
[ ] .env.local lengkap (tanpa commit)
[ ] codegraph install --yes   (sekali per mesin)
[ ] codegraph init            (sekali per clone)
[ ] typecheck + vitest hijau sebelum edit
[ ] Baca AGENTS.md + docs/DESIGN_SYSTEM.md + docs/ROLE_UI.md
```

Shortcut: `npm run setup:agent` (= `codegraph init` di folder project).

---

## 5. Environment (`.env.local`)

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://gdmqmoigudtgknkgomeu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-only, jangan expose ke client
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
```

- Prefix `NEXT_PUBLIC_` **wajib** untuk URL/anon key Supabase (`src/lib/db.ts`).
- Login Google **hanya** `@mutiarabangsa.sch.id`.
- Localhost OK untuk login PC. Redirect URI Google Console:
  - Dev: `http://localhost:3000/api/auth/callback/google`
  - Prod: `https://sevenbro.vercel.app/api/auth/callback/google`

---

## 6. Rules engineering (non-negotiable)

### Bahasa & copy
- UI **Bahasa Indonesia**.
- Label tombol/menu: **Title Case** (Beri Poin, Bayar Khusus, Setoran Hari Ini).
- Kalimat penjelas: normal case, formal.
- **Tanpa slang** di UI: jangan “Kasih Poin”, “kamu”, “utang”, “sepi”, “banget”.
- Istilah produk yang sudah mapan **boleh English**: Leaderboard, Battle Log, Kejar Podium, Scan Mode.
- **Tanpa em dash (—) di UI** kalau bisa diganti tanda baca lain.
- **Tanpa emoji** di UI.

### Desain
- Ikuti `docs/DESIGN_SYSTEM.md` — jangan hardcode warna baru.
- Mobile-first 360–480px; container `max-w-lg`.
- Typography: title `text-lg`, card title `text-[11px]`, body 10–11px, meta `text-[10px]`, micro `text-[9px]`.
- **Semua tabel wajib kolom No.**
- Nominal: prefix `Rp.` (`formatIDR`).
- Flat, `shadow-sm`, radius `rounded-xl` / `rounded-2xl`.
- Dark mode: token flip di `globals.css` (`.dark`); `text-forest` di dark sudah di-override terang.

### Role & data
- Policy SSOT: `src/lib/policies.ts`. UI hanya render; **server tetap `requireApi(policy)`**.
- Homeroom = super admin. TEACHER hanya `/app/scan`.
- Jangan commit secret / `.env*` / `.codegraph/` / `public/sw.js`.

### Quality gate (sebelum selesai task)
```bash
npm run typecheck
npx vitest run
```
Keduanya harus hijau. Untuk perubahan UI besar: `npm run build`.

### Git
- **Hanya commit / push / deploy kalau user suruh eksplisit.** Jangan auto-commit, auto-push, atau `vercel deploy` tanpa perintah.
- Commit message: `feat|fix|style|docs(scope): ringkas` + body jika perlu.
- Push ke `origin master` (setelah user minta).
- Jangan force-push / amend published commit.

---

## 7. Struktur penting

```text
src/app/app/           # halaman login-required (layout + nav)
  page.tsx             # Beranda
  pengumuman/          # Info
  agenda/
  kas/ + kas/buku/
  poin/ + scan/
  notifications/       # riwayat notif
  settings/
  admin/roster|settings/
src/app/api/           # route handlers (auth via requireApi)
src/components/        # AppShell, ui/, ui-primitives
src/lib/               # auth, db, policies, prefs, format, demo-data
supabase/migrations/   # SQL — push via `supabase db push`
docs/                  # DESIGN_SYSTEM, ROLE_UI, PROGRESS
android/               # Kotlin WebView shell (remote PWA URL) — lihat android/README.md
.codegraph/            # index lokal (gitignore)
```

---

## 8. Deploy (beta)

- Vercel project `kirimtugas-projects/sevenbro` → alias `sevenbro.vercel.app`
- Deploy: `vercel deploy --prod` (env sudah di Vercel Production)
- Supabase: `supabase link --project-ref gdmqmoigudtgknkgomeu && supabase db push`
- **Android shell:** konten web = deploy Vercel; APK native = rebuild `android/` (jangan bump versionCode untuk perubahan UI web)

### Android shell rules
- Jangan inject Android physical px ke CSS WebView (system bar insets → root layout padding)
- Jangan commit keystore / `local.properties` / `android/dist/`
- Update policy lengkap: `android/README.md`

---

## 9. Open / jangan asumsi selesai

- Web-push server (VAPID) belum — push = Notification API on-device
- Persist toggle hemat-data ke service worker belum
- Agenda lampau (API GET hanya mendatang)
- Tunggak semester: asumsi Jul/Des = ganjil, Jan/Genap = genap

Update `docs/PROGRESS.md` saat milestone selesai.

---

## 10. Referensi CodeGraph

- Repo: https://github.com/colbymchenry/codegraph
- Docs: https://colbymchenry.github.io/codegraph/
- Upgrade: `codegraph upgrade`
- Uninit project: `codegraph uninit`
