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
