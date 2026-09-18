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

---

## 4. Peta fitur → file kunci

| Fitur | File kunci |
|-------|------------|
| Policy role | `src/lib/policies.ts` + tests |
| Nav / shell | `src/app/app/layout.tsx`, `src/components/AppShell.tsx` |
| Kas | `src/app/app/kas/**`, `src/app/api/kas/**` |
| Poin / Mass Report | `src/app/app/poin/page.tsx`, `src/components/MassReport*.tsx`, `src/app/api/mass-reports/**` |
| Notif | `src/lib/notify.ts`, `src/lib/notif-nav.ts`, `src/app/api/notifications`, empty icon `AppShell.tsx` + `public/notif-empty.webp` |
| Roster + usulan | `src/app/app/admin/roster`, `src/app/api/admin/roster-proposals` |
| Android | `android/` + `android/README.md` |

---

## 5. Open yang harus disinkronkan bila dikerjakan

- Checklist piket (+1 / −1)
- Auto −1 kas mingguan + izin 3×
- Buka kembali Info/Agenda untuk murid
- Web-push VAPID
- Persist toggle offline ke SW

---

## 6. Bila session lain “beda otak”

1. Minta mereka baca file ini + `PROGRESS.md`
2. Jalan `node scripts/session-brain.mjs`
3. Jangan ulangi pekerjaan yang sudah di commit — cek `git log`



### Automation log
- last session-sync: `2026-09-18` · branch `master` · notif empty WebP + session-sync docs recorded
