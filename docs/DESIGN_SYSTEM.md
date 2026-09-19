# NL Design System (SSOT)

> **Single Source of Truth** for all UI & layout in this app.
> Extracted from the NL Discovery app. All new pages **MUST** follow these rules.

---

## 1. Prinsip

| Prinsip | Aturan |
|---|---|
| **Mobile-first** | Layout 360–480px; konten max `max-w-lg` |
| **Compact density** | Scale kecil — umum `text-[11px]` / `text-[10px]` / `text-[9px]` |
| **Satu baris** | Judul & meta di card → selalu `truncate` |
| **Kontras** | Page mint, card putih, dark card deep emerald |
| **Aksen terbatas** | Lime = progress/positif · acid = jam & lokasi di dark card · forest = active UI |
| **Flat & tenang** | Tanpa gradient di dashboard; `shadow-sm` saja |

---

## 2. Design Tokens (mixed Theme 1 + Theme 2)

### Color
```
Page bg          →  bg-page        #F3F7F4
Subtle fill      →  bg-surface     #EAF2EB
Card (light)     →  bg-white border border-line shadow-sm
Card (dark)      →  bg-deep        #0D211C
Forest           →  #144D36        active nav, primary accents, live rail
Lime             →  #A3E635        progress bar, success check
Lime soft        →  #D7F2A4        soft badges, call button bg
Acid             →  #EFFADB        jam / lokasi / angka di dark card
Amber            →  #FBA94C        quest / secondary
Alert            →  #EF4444
Ink              →  text-ink       #111827
Ink soft         →  text-ink-soft  #6B7280
Border           →  border-line    #D7E5DB
```

### Dark card text rules (WAJIB)
```
Label / eyebrow   →  text-white/55  atau  /70
Body              →  text-white/65  –  /70
Muted             →  text-white/45
Time / location   →  text-acid      (#EFFADB)
Big number        →  text-acid
Progress bar      →  bg-lime on bg-white/10 track
Border divider    →  border-white/10
```

### Tipografi
```
Page title        →  text-lg font-bold text-ink
Section heading   →  text-xs font-semibold text-ink
Card title        →  text-[11px] font-semibold text-ink  + truncate
Body / value      →  text-[10px] – text-[11px]
Meta              →  text-[10px] text-ink-soft/75
Micro             →  text-[9px]  text-ink-soft/75
```

### Geometry & spacing
```
Container radius  →  rounded-2xl
Item radius       →  rounded-xl
Icon well         →  h-8 w-8 rounded-lg bg-surface
Page padding      →  px-4 py-3
Section gap       →  space-y-4
List gap          →  space-y-1.5
```

### Interaksi
```
Tap               →  active:scale-[0.98] | active:scale-[0.97]
Card hover        →  (none — mobile)
```

### Mobile / Android safe area (WAJIB)

```
SSOT var (pakai di nav, Sheet, main):
  --sevenbro-nav-bar-inset   (shell set 0; default 0)
  --sevenbro-safe-bottom     = env(safe-area-inset-bottom) di browser;
                               shell set 0 (root native sudah pad system bar)

Bottom nav AppShell:
  padding-bottom = calc(var(--sevenbro-nav-bar-inset, 0px) + var(--sevenbro-safe-bottom, env(safe-area-inset-bottom, 0px)))

Sheet fullHeight (modal brief, dll.):
  height = calc(100dvh - var(--sevenbro-nav-bar-inset, 0px) - var(--sevenbro-safe-bottom, env(safe-area-inset-bottom, 0px)))
  JANGAN h-full / height:100% — bisa resolve ke auto → sheet hanya setinggi konten,
  bottom nav bocor di bawah backdrop (gap + nav terlihat).
  JANGAN 100dvh polos di browser — menutup gesture bar Android.
  Content scroll: pb ikut formula yang sama
```

WebView shell (`android/`) men-set `--sevenbro-*-inset` + `--sevenbro-safe-bottom` ke `0`; browser PWA pakai `env(safe-area-inset-bottom)`.

### Buttons (SSOT FINAL — acuan Brief Harian / Umum)

Contoh hidup: halaman **Info → Brief Harian + Umum** (`src/app/app/pengumuman/page.tsx`).

#### Primary (hijau forest)
```
flex items-center gap-1
rounded-full bg-forest text-white
text-[10px] font-semibold
px-2.5 py-1.5
active:scale-[0.97] transition-transform
icon: h-3.5 w-3.5
```
Contoh: **Brief Harian** · **Terbitkan Brief** · **Salin teks WA** · **Ganti manual** · **+ Tambah** (compact header)

#### Secondary (outline putih)
```
flex items-center gap-1
rounded-full border border-line bg-white text-ink
text-[10px] font-semibold
px-2.5 py-1.5
active:scale-[0.97] transition-transform
icon: h-3.5 w-3.5
```
Contoh: **Umum** · aksi alternatif di header page

#### Pin (toggle di header forest)
```
label: "Pin ke Beranda"  text-[10px] font-semibold text-white/85
switch: h-5 w-9 rounded-full
  ON:  bg-lime + knob left-[18px] bg-deep
  OFF: bg-white/30 + knob left-0.5 bg-white
bentuk: toggle (bukan tombol teks saja)
```

#### Destructive / hapus
```
teks text-alert · atau icon button active:text-alert
tanpa pill merah kecuali butuh konfirmasi kuat
```

#### Link aksi (bukan tombol)
```
min-h-9 px-1 text-[10px] font-semibold text-forest
TANPA background / border
```
Contoh: Muat ulang jadwal · Jadwal hari ini · Isi otomatis lagi

#### Aturan tombol
1. Bentuk default **pill** (`rounded-full`), bukan kotak rounded-lg acak
2. Primary = **bg-forest text-white**
3. Secondary = **border-line bg-white text-ink**
4. Label Title Case, Bahasa Indonesia
5. Icon opsional di kiri, `h-3.5 w-3.5`
6. Tap: `active:scale-[0.97]`
7. Min touch: py-1.5 + min-h-9 untuk baris padat
8. **Jangan** amber/oranye sebagai tombol primary
9. **Jangan** kasih background ke link aksi sekunder

---

### Form row pattern (SSOT — FINAL)

Acuan **final** dari **Info Brief → Piket & Tugas** (Homeroom approve 2026-09-18).
Terapkan ke semua section sejenis: Tugas, Remedial, Info lain, Piket, form admin.

#### 1. Sub-section frame (Tugas / Remedial / Info lain)

```
rounded-xl border border-line bg-page p-2.5 space-y-2
title: text-[11px] font-bold text-ink
hint:  text-[10px] text-ink-soft/60 mt-0.5
```

Tidak ada tombol aksi di header sub-section.

#### 2. Baris item (Tugas & Remedial — pola sama)

```
┌──────────────────────────────────────────┐
│ 1   [ Pilih mapel              ]    [×] │  border-b border-line/50
│     Siswa                                │
│     👤 Nama terpilih / placeholder    ▼ │  border-b border-line
│     Deskripsi  opsional                  │
│     [ Detail tugas / remedial         ]  │  dotted token line
└──────────────────────────────────────────┘
wrapper: rounded-xl border border-line bg-white
nomor:   w-4 text-[12px] font-bold text-forest tabular-nums
mapel:   FIELD_SELECT (min-h-11 rounded-lg border-line bg-page text-[12px])
hapus:   h-9 w-9 text-ink-soft active:text-alert
```

**Mapel options** = jadwal KBM hari brief (`subjectChipsForDate`).

#### 3. Select nama siswa (multi) — SSOT

```
baris:     min-h-11 flex items-center gap-2 border-b border-line py-2
kiri:      User h-4 w-4 text-ink-soft/70 (tanpa circle/background)
nilai:    truncate text-[12px] · kosong = "Pilih Nama Siswa" text-ink-soft/60
kanan:     ChevronDown h-4 w-4 (rotate-180 saat buka)
daftar:    telanjang (tanpa frame/kotak) · radio lingkaran forest bila terpilih
reset:     baris "Semua siswa" text-forest
```

Placeholder default: **Pilih Nama Siswa**. Nama terpilih tampil **1 baris + truncate** (bukan "n terpilih").

#### 4. Field opsional (deskripsi) — SSOT

```
label:       text-[10px] font-medium text-ink-soft + "opsional"
input:       min-h-11 rounded-xl border border-forest/45 bg-white
             px-3 py-2.5 text-[12px] text-ink
placeholder: text-ink-soft/45
focus:       ring-2 ring-forest/25 + border-forest
```

Border **berwarna (forest)** default pada field teks yang bisa diedit — sinyal tap/edit.
Select wajib (tanggal, mapel): `border-forest/40 bg-white`. **Tanpa** amber di field isian.
Tanpa hint basa-basi di bawah field (mis. “Sesuai jam generate…”).

#### 5. Tombol Add — SSOT

```
posisi:  HANYA di bawah daftar item sub-section (bukan di header)
label:   "+ Add"
style:   ROW_ADD = w-full rounded-xl border border-dashed border-line
         bg-white px-3 py-2 text-[10px] font-semibold text-ink-soft
```

Satu tombol Add per sub-section (Tugas / Remedial / Info). Tidak ada Add ganda di header + bawah.

#### 6. Info lain-lain

Baris teks opsional saja (tanpa mapel/siswa), tetap:
```
nomor + OptionalTextField + hapus
+ Add di bawah
```

#### 7. Outer frame (Piket & Tugas)

```
BriefSectionCard: rounded-2xl border border-line bg-white shadow-sm
header page: title + subtitle · tanpa action Add
```

#### 8. DILARANG

- Border SVG / gradient kustom di luar token
- Dotted stroke 2px+ / warna acak di luar `border-line`
- Kartu/chip berat per nama di select siswa
- `+ Add` di header sub-section
- Dropdown native `<select>` untuk daftar siswa
- `overflow-hidden` yang memotong daftar
- "n terpilih" sebagai pengganti daftar nama di baris select

#### 9. Field tanggal / sapaan / wajib

```
FIELD_SELECT: min-h-11 rounded-lg border border-line bg-page
              px-3 text-[12px] text-ink
FIELD_OPTIONAL: (teks edit) border-forest/45 bg-white — lihat bagian 4
```

Tanpa aksen amber/oranye di field isian form/brief.

#### 10. Tombol — lihat **§ Buttons (SSOT FINAL)** di atas

Primary pill forest · Secondary outline · Link tanpa background · Pin pill lime/white.

#### 12. Chip pilihan (preset seragam, jenis, audience)

Ikut **§ Buttons SSOT** — bentuk pill, bukan rounded acak:
```
active:   rounded-full bg-forest text-white px-2.5 py-1.5 text-[10px] font-semibold
inactive: rounded-full border border-line bg-white text-ink (padding sama)
reset:    PILL_SECONDARY (outline) — mis. "Pakai Jadwal"
label: Title Case
```

#### 13. Konstanta kode (acuan implementasi)

`src/components/InfoBriefForm.tsx`:
```
FIELD_SELECT   → min-h-11 rounded-lg border-forest/40 bg-white px-3 text-[12px]
FIELD_OPTIONAL → min-h-11 rounded-xl border-forest/45 bg-white
ROW_DELETE     → h-9 w-9 rounded-lg
ROW_ADD        → dashed border-line bg-white "+ Add"
PILL_PRIMARY   → Brief Harian · Salin teks WA (bg-forest text-white + icon)
PILL_SECONDARY → Umum · Pakai Jadwal (border-line bg-white)
TEXT_ACTION    → teks forest tanpa background
chipClass      → pill primary/secondary (preset seragam, dll.)
Pin            → label "Pin ke Beranda" + toggle switch
StudentMultiSelect · OptionalTextField
```

---

## 3. Anatomi halaman

```
┌─────────────────────────────────────┐
│ HEADER sticky h-12                  │  logo deep · bell · avatar
├─────────────────────────────────────┤
│ CONTENT bg-page px-4 py-3           │
│   Page title + subtitle             │
│   Dark card (progress / overview)   │
│   Section + list items              │
├─────────────────────────────────────┤
│ BOTTOM NAV                          │  Schedule · Packing · Home · Quest · Contacts
└─────────────────────────────────────┘
```

---

## 4. Bottom Nav (standar)

```
5 item rata, w-[52px], label di bawah ikon
Order: Schedule · Packing · Home · Quest · Contacts
Home = item tengah biasa (bukan FAB)

Active:
  bg-forest/15
  text-forest
  rounded-md
  icon stroke-[2.25]

Idle:
  text-ink-soft/75
  icon stroke-[1.5]
```

---

## 5. Pola komponen

### 5.1 Page header
```tsx
<div>
  <h1 className="text-lg font-bold text-ink">{title}</h1>
  <p className="text-[11px] text-ink-soft/75">{subtitle}</p>
</div>
```

### 5.2 Section header
```tsx
<SectionHeader title="Clothing" count="2/4" />
// count badge: bg-surface text-ink-soft text-[9px]
```

### 5.3 List row (semua list page)
```tsx
<div className="bg-white border border-line shadow-sm rounded-xl p-2.5 flex items-center gap-2.5 active:scale-[0.98] transition-transform">
  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface shrink-0">
    <Icon className="h-3.5 w-3.5 text-forest" />
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-[11px] font-semibold text-ink truncate">Title</p>
    <p className="text-[10px] text-ink-soft/75 truncate">Subtitle</p>
  </div>
</div>
```

### 5.4 Dark card (overview / progress / hero)
```tsx
<div className="bg-deep rounded-2xl p-4 text-white">
  {/* label white/55 · angka & jam acid · body white/65 */}
  <ProgressCard eyebrow={...} value={42} sub="%" percent={42} doneLabel="2/4 done" />
  <HeroCard eyebrow="Happening now" meta="10:30 — 12:30" title="..." location="..." />
</div>
```

### 5.5 Dense day/section list (long lists — don't use Timeline here)
```
Row: time col (start / end / duration) · rail dot · title + location + note
Live NOW   → bg-lime-soft/40 + border-l-lime + chip NOW (bg-forest)
Grouping   → bg-surface/60 header + chip (bg-forest/12 text-forest)
Highlight  → amber chip
```

---

## 6. Aturan keras

| ❌ Jangan | ✅ Lakukan |
|---|---|
| `bg-gray-*` / `text-gray-*` di app | Token: page, surface, deep, ink, ink-soft, line, acid, lime, forest |
| Teks gelap di dark card | white/45–70 · jam/lokasi = acid |
| Timeline di Schedule | Dense day list (lihat Schedule page) |
| Home FAB terpisah | 5 nav seragam, Home di tengah |
| Active nav solid forest tebal | `bg-forest/15` + `rounded-md` |
| Judul multi-baris | `truncate` |
| Shadow tebal / gradient | `shadow-sm`, flat |
| Hover desktop-only | `active:scale-*` |

---

## 7. Reference implementations

- Home (`/app`) — stats + hero + upcoming list
- Browse (`/app/browse`) — tabs, badges, buttons, list rows, empty state
- Activity (`/app/activity`) — grouped list layout
- Saved (`/app/saved`) — SwipeRow swipe-to-action list
- Settings (`/app/settings`) — toggle rows, buttons
