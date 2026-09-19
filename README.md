# Seven Bro!

PWA manajemen kelas **7B** (Mutiara Bangsa 2 JHS): **Kas**, **Info**, **Agenda**, **Poin**.  
Plus **Android WebView shell** (`android/`) yang wrap PWA remote.

| | |
|---|---|
| Stack | Next.js 15 · React 19 · Tailwind 4 · next-auth v4 · Supabase · SWR · Vitest · Android Kotlin |
| Prod | https://sevenbro.vercel.app |
| Repo | https://github.com/ictcodehub/sevenbro |

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Scripts: `dev` · `build` · `start` · `lint` · `typecheck` · `session:sync`

## Docs (SSOT — jangan dobel)

| File | Isi |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Rules agent, CodeGraph, bootstrap, deploy |
| [`docs/SESSION_SYNC.md`](docs/SESSION_SYNC.md) | Keputusan lintas session |
| [`docs/PROGRESS.md`](docs/PROGRESS.md) | Status selesai / open / deploy |
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Warna, tipografi, safe area, buttons |
| [`docs/ROLE_UI.md`](docs/ROLE_UI.md) | Matriks role → aksi |
| [`docs/POINT_SYSTEM.md`](docs/POINT_SYSTEM.md) | Faktor poin + Mass Report |
| [`docs/INFO_BRIEF_SPEC.md`](docs/INFO_BRIEF_SPEC.md) | Brief harian Sekretaris |
| [`docs/PUSH_NOTIFICATIONS.md`](docs/PUSH_NOTIFICATIONS.md) | FCM push |
| [`android/README.md`](android/README.md) | Build & system bars APK |

Awal session agent: `npm run session:sync` (atau `node scripts/session-sync-workflow.mjs`).

Ship penuh (docs + CodeGraph + commit + push + Vercel): ketik **`/deploy-it`** di MiMo.

Dev utama: **MiMo Desktop**. Hermes tidak dipakai.
