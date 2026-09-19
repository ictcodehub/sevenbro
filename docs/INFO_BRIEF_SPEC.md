# INFO_BRIEF_SPEC — Form Info ala Freissy (Sekretaris)

> Status: **fase 1 diimplementasi (lokal)** — migration `010_info_brief.sql`, API, form Brief Harian, Info/Agenda dibuka.
> Push DB Supabase + deploy prod **hanya jika user suruh**.
> Sumber: WA harian Freissy + `Mapel Kelas 7.xlsx` + `Seragam Kelas 7 - SMP Mutiara Bangsa 2.txt`.

---

## 0. Keputusan Homeroom (2026-09-18)

| # | Keputusan |
|---|-----------|
| 1 | Posting Info harian: **Sekretaris** (policy tetap izinkan Homeroom + Ketua) |
| 2 | **Semua siswa** melihat Info saat rilis |
| 3 | Seed mapel: **jadwal fix KBM 7B** (timetable AY 2026-2027) auto per hari + JP/jam |
| 4 | Preset seragam: **auto per hari** Sailor/Batik/Pramuka (+ P.E Jumat); custom opsional |
| 5 | Menu **Agenda dibuka** untuk Sekretaris (dan siswa view) |
| 6 | **Satu brief DAILY per tanggal** (upsert) |
| 7 | Export **Salin teks WA**: nice to have — **sudah ada** di form |
| 8 | Auto A4/B3 dari piket brief: **belum** — backlog terpisah |

---

## 1. Masalah

Kebiasaan kelas: Sekretaris (Freissy) menulis **brief harian** di chat group, bukan “pengumuman bebas”.

Form Info sekarang hanya **Judul + Isi + Pin**. Jika tidak distruktur, Freissy akan paste seluruh teks WA ke body — app tidak mengurangi kerja, hanya memindahkan chat.

Policy server sudah benar: `canPostAnnouncement` = HOMEROOM + KETUA + SEKRETARIS.  
Yang menghalangi: `PAGE_ROLES = ["HOMEROOM"]` di halaman Info/Agenda.

---

## 2. Anatomi brief (template Freissy)

Urutan tetap yang dipakai kelas:

1. **Sapaan** — template formal (“Selamat sore… mengingatkan…”)
2. **Tanggal** — “besok” + tanggal lengkap (WIB)
3. **Seragam** — enum (mis. Pramuka uniform, P.E, Batik)
4. **Pelajaran** — daftar mapel + **JP** (contoh: Science 2JP, P.E 2JP, VA 2JP, Mandarin 2JP, Pramuka 1JP)
5. **Piket** — nama siswa dari roster (contoh: Jolin, Jesslyn, Erica)
6. **Tugas / Membawa** — list campuran:
   - Atribut/seragam (“Bawa baju P.E”, “Pramuka bawa topi dan peluit”)
   - Tugas mapel + remedial subset
   - Kegiatan/event (“LDKS 2 hari” + nama peserta)
7. **Penutup** — template (“Itu saja”)

Pesan WA **satu hari** = Info harian + soft-link Agenda (LDKS) + mapel + piket + subset roster.

---

## 3. Pemisahan Info vs Agenda

| Konten Freissy | Info brief? | Agenda (`events`)? |
|----------------|:-----------:|:------------------:|
| LDKS 2 hari + nama | Ya (chip/link) | **Ya** — sumber kalender |
| Hari belajar “besok” | Ya (field tanggal) | Opsional, bukan wajib |
| Piket harian | Ya | Tidak (v1) |
| Tugas mapel | Ya | Tidak |
| Seragam | Ya | Tidak |

**Prinsip:**  
- **Info** = operasional kelas untuk tanggal X (brief).  
- **Agenda** = kebenaran kalender (LDKS, upacara, class meeting).  
- **Jangan merge.** Brief boleh **link/create** event; event id sama, dua permukaan UI.

Catatan API Agenda: GET hanya event **mendatang** (`gte starts_at`). Brief menyimpan snapshot sendiri; tidak bergantung riwayat Agenda.

---

## 4. Data yang belum ada

| Entitas | Ada? | Perlu untuk brief? |
|---------|:----:|:-------------------:|
| `announcements` (title/body/pinned) | Ya | Tetap untuk **Info Umum**; brief menulis `body` hasil generate agar kartu lama + notif tetap jalan |
| `events` | Ya | Link LDKS; v1 tanpa ubah schema |
| **`subjects` (mapel)** | **Tidak** | **Ya** — master data + seed |
| **`daily_briefs` + section** | **Tidak** | **Ya** |
| Preset seragam | Tidak | Daftar kecil, editable Homeroom |
| Jadwal piket permanen | Tidak | v1 = nama di brief saja |
| Peserta event formal | Tidak | v1 = nama di note / item brief |
| Roster siswa | Ya | Multi-select piket & “untuk siswa” |

### 4.1 Usulan schema (fase 1)

```text
subjects
  id, class_id, name, short_name?, active

subject_seed (contoh awal, WA Freissy — konfirmasi Homeroom):
  Science, P.E, VA, Mandarin, Pramuka
  (+ mapel sekolah lain bila Homeroom setujui — JANGAN hardcode kurikulum penuh)

daily_briefs
  id, class_id, date (DATE, WIB), kind: DAILY | GENERAL
  title, greeting?, pinned, created_by, created_at
  uniform?, uniform_note?
  body_generated (text)  -- untuk list UI + notif backward compatible

brief_subjects
  brief_id, subject_id, jp int, note?

brief_duties          -- piket
  brief_id, student_id, sort?

brief_items           -- tugas / membawa
  brief_id
  kind: BRING | TASK | EVENT_NOTE | CUSTOM
  subject_id?         -- wajib jika TASK (ideal)
  text
  audience: ALL | NAMED | REMEDIAL
  student_ids?        -- json / join table
  linked_event_id?    -- → events.id
```

**JP** disimpan di **baris brief** (`brief_subjects.jp`), bukan di master subject — mapel yang sama bisa beda JP per hari.

---

## 5. Kebutuhan form (Sekretaris → Buat Info)

### A. Header

| Field | Wajib | Catatan |
|-------|:-----:|---------|
| Tanggal info | Ya | Default **besok** (habit Freissy) |
| Label relatif | Auto | “Hari ini” / “Besok” via `formatDateID` + WIB |
| Judul | Ya | Auto-suggest “Info Harian · Jum, 17 Sep”; boleh override |
| Sapaan | Opsional | Template default, editable |
| Pin | Ya | Sama seperti sekarang |
| Tipe | Ya | **DAILY** (brief) \| **GENERAL** (Judul+Isi lama) |

### B. Seragam

| Field | Wajib | Catatan |
|-------|:-----:|---------|
| Seragam | Opsional | Enum preset: Batik · Olahraga/P.E · Pramuka · Bebas · Lainnya |
| Catatan | Opsional | Jika Lainnya |

### C. Pelajaran hari ini

| Field | Wajib | Cataran |
|-------|:-----:|---------|
| Baris mapel | Opsional | Pilih `subjects` + **JP** + note |
| JP | Ya jika ada baris | Integer ≥ 1 |

UI: `[Mapel ▾] [JP] [catatan] [+ tambah]` — compact, mobile-first.

### D. Piket

| Field | Wajib | Catatan |
|-------|:-----:|---------|
| Anggota | Opsional | Multi-select **roster**; `formatDisplayName` |

v1 hanya tampil di brief. A4/B3 checklist poin **bisa** consume data ini nanti — bukan blocker fase 1.

### E. Tugas / Membawa

| Field | Wajib | Catatan |
|-------|:-----:|---------|
| Jenis | Ya | Atribut · Tugas mapel · Kegiatan · Umum |
| Teks | Ya | Bebas |
| Mapel | Ideal jika Tugas mapel | Link `subject_id` |
| Untuk | Ya | Semua · Nama siswa · Remedial |
| Lampir agenda | Jika Kegiatan | Create/pick `events` |

### F. Link Agenda

- Checkbox / chip: **Tambahkan ke Agenda**
- Mini form event atau picker event mendatang
- Simpan `linked_event_id` di `brief_items` / relasi brief–event
- Event tetap kelihatan di menu Agenda (Homeroom; Sekretaris manage via policy yang ada)

### G. Preview + output

- Preview urutan: tanggal → seragam → pelajaran → piket → tugas (bahasa Indonesia, **tanpa emoji di UI**, tanpa em dash)
- Simpan structured rows + **generate `body_generated`** (teks polos) untuk kartu list + notif
- Opsional nanti: “Salin teks WA” — bukan syarat fase 1

### H. Notifikasi

- 1 brief → 1 notif kelas (saat Info dibuka untuk murid)
- Link agenda: jangan double-spam; ikut alur notif existing (`kind: announcement` / `agenda`)

---

## 6. Role & akses (usulan saat feature hidup)

| Role | Info page | Create/edit brief | Agenda page |
|------|-----------|-------------------|-------------|
| HOMEROOM | ✅ | ✅ semua | ✅ |
| KETUA | ✅ (manage) | ✅ (policy existing) | ✅ (manage) |
| SEKRETARIS | ✅ (manage) | ✅ **aktor utama** | ✅ atau create via form brief saja |
| ANGGOTA | Read-only **jika** dibuka | ❌ | Read-only **jika** dibuka |
| TEACHER | — | — | — |

**Fase aman:** buka `PAGE_ROLES` Info untuk HOMEROOM + KETUA + SEKRETARIS dulu; murid tetap disabled sampai Homeroom setuju brief dipakai harian.

Server tetap `requireApi(canPostAnnouncement)` / `canManageAgenda` — UI hanya render.

---

## 7. Open decisions (SUDAH DIJAWAB — lihat §0)

Semua keputusan kunci sudah diisi Homeroom 2026-09-18. Sisa open teknis:

- Push `010_info_brief.sql` ke Supabase (`supabase db push`)
- Deploy Vercel setelah user minta
- QA form di device (Sekretaris Freissy / Andra)
- Piket checklist → poin A4/B3 (fitur terpisah)
- Link create event dari form (v1: `event_title` teks saja di payload)

---

## 8. Implementasi fase 1 (status)

| # | Item | Status |
|---|------|--------|
| 1 | Migration `010_info_brief.sql` (`subjects`, `daily_briefs`) | ✅ file repo |
| 2 | Lib `src/lib/info-brief.ts` + tests | ✅ 180 tests green |
| 3 | API `/api/subjects` (auto-seed kurikulum) | ✅ |
| 4 | API `/api/info-briefs` GET/POST (1 brief/hari + notif siswa) | ✅ |
| 5 | Form `InfoBriefForm` + tombol **Brief Harian** di Info | ✅ UX chip (tap mapel/seragam/jenis; hindari select sempit) |
| 6 | PAGE_ROLES Info + Agenda untuk semua siswa aktif | ✅ |
| 7 | Nav + Beranda: Info/Agenda aktif untuk murid | ✅ |
| 8 | Salin teks WA | ✅ |
| 9 | Push DB 010 | ✅ `supabase db push` 2026-09-18 |
| 10 | Deploy prod + QA device + piket→poin | ⬜ menunggu user |

### Form / UI (FINAL — SSOT DESIGN_SYSTEM § Form row pattern)

- Tugas & Remedial: **mapel (jadwal hari ini) + StudentMultiSelect + OptionalTextField**
- Info lain: baris teks opsional saja
- `+ Add` **hanya di bawah** sub-section, label **+ Add**
- Piket: StudentMultiSelect (User icon + truncate + naked radio list)
- Seragam / sapaan / tanggal: auto dari hari + jam generate
- Acuan lengkap: `docs/DESIGN_SYSTEM.md` § Form row pattern (SSOT — FINAL)

### File kunci fase 1

| File | Peran |
|------|--------|
| `supabase/migrations/010_info_brief.sql` | Schema |
| `src/lib/info-brief.ts` | Seed mapel, preset seragam, generate body |
| `src/app/api/subjects/route.ts` | List mapel + seed |
| `src/app/api/info-briefs/route.ts` | Brief harian |
| `src/components/InfoBriefForm.tsx` | Form Sekretaris |
| `src/app/app/pengumuman/page.tsx` | PAGE_ROLES + entry brief |

---

## 9. Referensi kode

| File | Peran |
|------|--------|
| `src/app/app/pengumuman/page.tsx` | Info page + Brief Harian / Umum |
| `src/app/api/announcements/route.ts` | POST title/body/pinned; `canPostAnnouncement` |
| `src/app/app/agenda/page.tsx` | PAGE_ROLES siswa; `canManageAgenda` |
| `src/app/api/events/route.ts` | events CRUD; GET future only |
| `src/lib/policies.ts` | SSOT role |
| `src/lib/info-brief.ts` | Brief generate + seed |
| `docs/POINT_SYSTEM.md` | A4/B3 piket |
| `docs/ROLE_UI.md` | Matriks role (updated) |

---

## 10. Aturan non-negotiable (ikuti AGENTS.md)

- UI Bahasa Indonesia; label Title Case; tanpa slang, emoji, em dash di UI
- Ikuti `docs/DESIGN_SYSTEM.md` — jangan hardcode warna baru
- Tabel wajib kolom **No.**
- Policy SSOT `policies.ts`; server tetap `requireApi`
- Quality gate: `npm run typecheck` + `npx vitest run`
- Commit/push/deploy **hanya jika user suruh**
- Setelah implementasi: update `PROGRESS.md`, `ROLE_UI.md`, `SESSION_SYNC.md` bagian Keputusan
