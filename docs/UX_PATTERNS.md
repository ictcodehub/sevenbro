# Admin UX Patterns (SSOT)

> Approved UI/UX rules for **admin/manage panels**.
> Used for any list-management screen (schedule, quests, users, …).
> Don't invent new patterns without confirmation.

---

## 1. List & aksi

| Pola | Aturan |
|---|---|
| **Group by day** | Schedule & Quests: cluster per `Day N` (collapse) |
| **Compact rows** | 1 baris padat — bukan card besar |
| **Tap baris** | Buka **modal edit** |
| **Swipe kiri** | Aksi: **Edit** · **Copy** (opsional) · **Delete** |
| **Swipe kanan / tap lagi** | Tutup swipe |
| **Petunjuk** | `‹` tipis di ujung baris |

Komponen: `src/components/admin/SwipeRow.tsx`

---

## 2. Tambah data

| Pola | Aturan |
|---|---|
| **Tombol Add** | Kartu putih full-width ala Schedule — ikon `+` · label · chevron |
| **Quest** | Tap Add → **modal fullscreen** (form meta + builder per tipe) |
| **Schedule** | Tap Add → form **inline** di bawah tombol (collapse) |
| **Users** | Tap **Add user** → **bottom sheet** (name, email, role, class) |

---

## 3. Filters

| Halaman | Filter |
|---|---|
| **Schedule** | Chip: All · Day 1–4 · collapse per hari |
| **Quests** | Chip: All · Day 1–4 · collapse per hari |
| **Grades** | Chip: Pending · Graded · All · dropdown **per quest** |
| **Users** | **Toggle cycle** Students/Staff di toolbar · Staff: Role · Students: Jenjang + Kelas · default kelas **7A** |

Filter = **dropdown / chip**, **bukan** accordion per kelas.

---

## 4. Users — standar list

| Item | Standar |
|---|---|
| Toolbar atas | **Toggle cycle** Students ⇄ Staff · tombol **Add User** |
| Default saat buka | Tab **Students** · filter kelas **7A** |
| Baris (staff & siswa) | Nama · badge kelas · email · **swipe** edit/delete |
| Role dropdown | **Tidak ada di baris** — ubah lewat **modal edit** |
| Add / Edit / Delete | Modal + **swipe** (bukan tombol inline di baris) |
| Cluster | Hanya satu aktif (Students atau Staff) |

---

## 5. Grades — standar grading massal

| Pola | Aturan |
|---|---|
| Layout | **Grid card quest** (2 kolom) — tanpa list siswa di halaman utama |
| Tap card | Buka **modal fullscreen** grading per quest |
| Filter | Status (Pending/Graded) · Day · Level (SMP/SMA) · Class |
| Default | **Pending** · **Day aktif** (bisa diubah) |
| Modal siswa | Accordion per siswa → jawaban / foto / score / feedback |
| Foto | Preview via signed URL (bucket `quest-media`) |

---

## 6. Modal & form

| Pola | Aturan |
|---|---|
| Quiz editor | **Accordion** soal + **Jump** Qn + reorder ↑↓ |
| Kunci jawaban | MCQ: tap A/B/C hijau · SHORT: field answer key |
| Validasi | Banner merah + border merah sebelum save |
| Import/export | **Tidak dipakai** di UI quest (duplikasi saja) |

---

## 7. Warna & kontrol

- Active filter: `bg-forest/15 text-forest`
- Idle filter: `border border-line bg-white text-ink-soft`
- Header day: `bg-surface/60` + chip `bg-forest/12 text-forest`
- Danger: `text-alert`
- Touch target minimum ~44px untuk aksi utama

---

## 8. Jangan

| ❌ | ✅ |
|---|---|
| Tombol edit/delete inline di list | SwipeRow |
| Accordion per kelas | Dropdown filter |
| Dropdown role di baris mana pun | Ubah role di **modal edit** |
| Form nempel permanen di atas | Modal / Add card |
| JSON mentah di Grades | Tampilan terformat |
| Template download quest | Duplicate quest |
