# CLAUDE.md — Seven Bro (cross-tool entry)

> Agentic tool lain (Claude Code, Cursor, Codex, dll.): baca **AGENTS.md** utama.

## Automation (wajib di awal session)

```bash
node scripts/session-sync-workflow.mjs
```

Definisi workflow: `docs/workflows/session-sync.md`

## Otak bersama (SSOT — jangan dobel)
- `docs/SESSION_SYNC.md` — keputusan lintas session
- `docs/PROGRESS.md` — status / **Open** / deploy
- `docs/DESIGN_SYSTEM.md` · `docs/ROLE_UI.md` · `docs/POINT_SYSTEM.md`
- `docs/INFO_BRIEF_SPEC.md` · `docs/PUSH_NOTIFICATIONS.md` · `android/README.md`

Jangan commit/push/deploy kecuali user minta — **atau** user ketik **`/deploy-it`** (skill `.mimocode/skills/deploy-it/`).
