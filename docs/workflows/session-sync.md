# Workflow: session-sync

> Otomasi otak bersama project **sevenbro**.  
> Berlaku di **MiMo Desktop**, **Claude Code**, **Cursor**, **Codex**, dan agentic tool lain yang membaca entry file `AGENTS.md` / `CLAUDE.md`.

---

## When to run (auto)

| Trigger | Tool |
|---------|------|
| **Awal session** (turn pertama yang menyentuh kode/dokumen) | Semua agentic tool |
| Sebelum task besar (>3 langkah) | Semua |
| Setelah keputusan produk / commit | Semua |
| User bilang “sync session” / `/session-sync` | Semua |
| User ketik **`/deploy-it`** | MiMo — pipeline penuh (docs + codegraph + commit + push + Vercel) |

Jangan tunggu user mengingatkan.

### `/deploy-it` (ship penuh)

Skill: `.mimocode/skills/deploy-it/SKILL.md`  
Urutan: update `SESSION_SYNC` + `PROGRESS` + project MEMORY → `codegraph sync` → `typecheck` + `vitest` → `git commit` → `git push` → `vercel deploy --prod`.  
`/deploy-it` **sudah** merupakan izin commit/push/deploy (AGENTS § Git).

---

## Command (satu cara, semua tool)

```bash
node scripts/session-sync-workflow.mjs
```

Atau via npm:

```bash
npm run session:sync
```

Script akan:
1. Baca `AGENTS.md`, `docs/SESSION_SYNC.md`, `docs/PROGRESS.md`
2. Ambil `git log` + `git status`
3. Tulis ringkasan otak ke stdout
4. Stamp “last sync” di `docs/SESSION_SYNC.md` (bagian automation log)

---

## Agent checklist (wajib ikut)

1. **Run** `node scripts/session-sync-workflow.mjs`
2. **Baca** output keputusan & open items
3. **Kerja** sesuai task user
4. **Update** `docs/PROGRESS.md` jika ada perubahan status
5. **Update** `docs/SESSION_SYNC.md` → bagian **Keputusan sinkron** jika ada keputusan produk
6. **CodeGraph**: `codegraph sync` jika ubah kode signifikan
7. **Jangan** commit/push/deploy kecuali user eksplisit

---

## Binding untuk tool lain

| Tool | Bagaimana workflow jalan |
|------|--------------------------|
| **MiMo Desktop** | `AGENTS.md` wajib baca + MEMORY.md pointer; agent run script di awal |
| **Claude Code** | `AGENTS.md` / `CLAUDE.md` → run script |
| **Cursor / Codex / dkk.** | Baca `AGENTS.md`; ikuti checklist di atas |
| **Git** | Opsional: pre-commit cek `SESSION_SYNC.md` dirty bersama `src/**` |

---

## Output yang diharapkan

Agent setelah run **tahu**:
- Branch + commit terbaru
- Keputusan sinkron terkini
- Open items
- File kunci yang wajib konsisten antar session
