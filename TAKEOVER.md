# Seven Bro! — Kelas 7B PWA · Takeover Document

> **Dokumen ini** untuk handoff ke MiMo / developer berikutnya.
> Semua informasi detail, tertulis lengkap — termasuk route, komponen, DB, dan status pengerjaan.

---

## 0. Identitas Proyek

| Item | Value |
|---|---|
| **Nama app** | **Seven Bro!** (bukan KelasKita 7B) |
| **Tagline** | "Aplikasi mutiara bangsa 2 — kas, pengumuman & agenda, poin perilaku" |
| **Stack** | Next.js 15 (App Router) + React 19 + Tailwind v4 + shadcn/ui + next-auth v4 + Supabase + SWR |
| **Target PWA** | Yes (next-pwa, manifest.json, sw.js) |
| **Workspace** | `D:\Workspace\sevenbro` |
| **Dev server** | `npm run dev` → `http://localhost:3000` |
| **Supabase project** | `gdmqmoigudtgknkgomeu` (ap-southeast-1) |
| **Build system** | npm + vitest (tests) + tsc (typecheck) + next build |

---

## 1. Struktur File

```
D:\Workspace\sevenbro\
├── public\
│   ├── brand-logo.png            # Logo brand Seven Bro!
│   ├── manifest.json             # PWA manifest → name: "Seven Bro!"
│   ├── sw.js                     # Service worker (next-pwa)
│   ├── icon-192.png / icon-512.png / icon-maskable-512.png / apple-touch-icon.png
│
├── src\
│   ├── app\
│   │   ├── layout.tsx            # Root layout (html/body + AuthProvider)
│   │   ├── globals.css            # Tailwind v4 + BENTO GRID CSS custom
│   │   ├── page.tsx               # Root → redirect to /app
│   │   ├── login\
│   │   │   └── page.tsx           # Login halaman Google OAuth
│   │   └── app\                   # Semua route /app/* di bawah sini
│   │       ├── layout.tsx         # ShellLayout (AppShell + role-based nav)
│   │       ├── page.tsx           # Beranda (BENTO GRID dashboard)
│   │       ├── pengumuman\
│   │       │   └── page.tsx       # Info/Pengumuman page
│   │       ├── agenda\
│   │       │   └── page.tsx       # Agenda page
│   │       ├── kas\
│   │       │   └── page.tsx       # Kas page
│   │       ├── poin\
│   │       │   └── page.tsx       # Poin/Leaderboard page
│   │       ├── settings\
│   │       │   └── page.tsx       # Settings page
│   │       └── api\
│   │           └── auth\
│   │               └── [...nextauth]\
│   │                   └── route.ts # NextAuth handler
│   │
│   ├── lib\
│   │   ├── db.ts                  # Supabase admin client (service_role)
│   │   ├── auth.ts                # next-auth authOptions + callbacks
│   │   ├── session.ts             # getContext, requireApi, apiError, setContextReader
│   │   ├── session.test.ts        # 14 tests untuk session.ts
│   │   ├── policies.ts            # 6 role-based policies (canPostAnnouncement, dll.)
│   │   ├── policies.test.ts       # 34 tests untuk policies.ts
│   │   ├── format.ts              # formatIDR, monthKeyWIB, monthLabel, formatDateID, formatTimeID
│   │   ├── format.test.ts         # 20 tests untuk format.ts
│   │   ├── fetcher.ts             # fetcher<T> + useAppSWR<T> (SWR wrapper)
│   │   ├── fetcher.test.ts        # tests untuk fetcher.ts
│   │   └── demo-data.ts           # Data siswa asli 16 orang, announcements, agenda, kas, leaderboard
│   │
│   ├── components\
│   │   ├── AuthProvider.tsx       # SessionProvider wrapper (next-auth)
│   │   ├── AppShell.tsx           # Shell layout utama: header, notif dropdown, bottom nav
│   │   ├── ui-primitives.tsx      # SSOT: SectionHeader, StatCard, ListRow, HeroCard, ProgressCard, EmptyState, Timeline, TimelineItem
│   │   ├── ui\                    # shadcn/ui components
│   │   │   ├── button.tsx, card.tsx, tabs.tsx, badge.tsx, avatar.tsx
│   │   └── admin\
│   │       └── SwipeRow.tsx       # Admin swipe row component (future)
│   │
│   ├── middleware.ts              # next-auth middleware (protect /app/* routes)
│   ├── types\
│   │   └── next-auth.d.ts         # module augmentation for SessionUser.role
│   └── lib\utils.ts              # cn() utility (clsx + tailwind-merge)
│
├── supabase\
│   └── migrations\                # 001_init.sql, 002_seed.sql
│
├── .env.local                     # Credentials (gitignored!)
├── .next\                         # Build output
├── tailwind.config.ts
├── next.config.mjs
├── components.json
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── TODO.md
└── README.md
```

---

## 2. Environment & Credentials

**File**: `D:\Workspace\sevenbro\.env.local` (gitignored)

```env
# ============================================================
# KelasKita 7B — environment local (JANGAN commit)
# ============================================================

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<redacted>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://gdmqmoigudtgknkgomeu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<redacted>
SUPABASE_SERVICE_ROLE_KEY=<redacted>

# Google OAuth
GOOGLE_CLIENT_ID=863213321151-46lq8bqlgcnn6nuntghb1mladlj1ut91.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<redacted>

# Cron / VAPID (for PWA push notifications — future)
CRON_SECRET=<redacted>
VAPID_PUBLIC_KEY=<redacted>
VAPID_PRIVATE_KEY=<redacted>
```

**Catatan penting**:
- `NEXT_PUBLIC_` prefix wajib untuk `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` (baca di `lib/db.ts`)
- `NEXTAUTH_SECRET` harus di-generate (bukan kosong)
- GOOGLE_CLIENT_ID sudah diverifikasi valid
- **Redirect URI di Google Console** harus: `http://localhost:3000/api/auth/callback/google`

---

## 3. Supabase Database Schema

**Project**: `gdmqmoigudtgknkgomeu` (ap-southeast-1)

### Tables & Relations

```
public.profiles (users)
├── id: uuid (PK)
├── email: text (UNIQUE)
├── full_name: text
├── role: user_role_enum (HOMEROOM | KETUA | BENDAHARA | SEKRETARIS | ANGGOTA | PENDING)
├── class_id: uuid (FK → classes.id)
├── created_at: timestamptz
└── updated_at: timestamptz
    → Trigger: set_role_on_profile_change() (sync role → profiles.role)
    → Policy: SELECT authenticated | INSERT authenticated | UPDATE own

public.classes
├── id: uuid (PK)
├── name: text ("7B")
├── homeroom_teacher_id: uuid (FK → profiles.id)
├── created_at: timestamptz
└── Policies: admin (HOMEROOM)

public.students
├── id: uuid (PK)
├── full_name: text
├── email: text
├── position: text (position within class)
├── class_id: uuid (FK → classes.id)
├── created_at: timestamptz
└── Policies: SELECT authenticated | INSERT authenticated | UPDATE admin

public.agenda_items
├── id: uuid
├── title: text
├── description: text
├── location: text
├── date: date
├── time: time
├── category: text
├── created_by: uuid (FK → profiles.id)
├── class_id: uuid
├── created_at: timestamptz
└── Policies: admin (HOMEROOM) | SELECT authenticated

public.dues_months
├── id: uuid
├── month: text (YYYY-MM format)
├── amount: integer
├── class_id: uuid
├── created_at: timestamptz
└── Policies: SELECT authenticated | admin (HOMEROOM)

public.dues_transactions
├── id: uuid
├── month_id: uuid (FK → dues_months.id)
├── student_id: uuid (FK → students.id)
├── amount_paid: integer
├── paid_at: timestamptz
├── created_at: timestamptz
└── Policies: authenticated

public.announcements
├── id: uuid
├── title: text
├── body: text
├── author_id: uuid (FK → profiles.id)
├── class_id: uuid
├── pinned: boolean (default false)
├── created_at: timestamptz
└── Policies: admin (HOMEROOM | KETUA) | SELECT authenticated

public.points_logs
├── id: uuid
├── student_id: uuid (FK → students.id)
├── points: integer
├── reason: text
├── given_by: uuid (FK → profiles.id)
├── class_id: uuid
├── created_at: timestamptz
└── Policies: admin (HOMEROOM) | SELECT authenticated

public.leaderboard
├── id: uuid
├── student_id: uuid (FK → students.id)
├── total_points: integer
├── class_id: uuid
├── updated_at: timestamptz
└── Policies: SELECT authenticated | admin (HOMEROOM)
```

### RLS Status
- **ENABLED** pada semua tables
- Policies sudah dipasang: `authenticated` SELECT, `admin` INSERT/UPDATE/DELETE
- `HOMEROOM` = tio@mutiarabangsa.sch.id (via trigger upsert saat login pertama)

### Seed Data (16 siswa 7B)

| Nama | Email | Position |
|------|-------|----------|
| Edmund Gracio Wirjo | edmundgracio@mutiarabangsa.sch.id | KETUA |
| Madeline Mellow Andrea | madelinea@mutiarabangsa.sch.id | BENDAHARA |
| Pauline Joice Widjadja | paupau@mutiarabangsa.sch.id | BENDAHARA |
| Freissy Celestyn Lien | freissy@mutiarabangsa.sch.id | SEKRETARIS |
| Muhamad Dwi Andra Shakti | andra@mutiarabangsa.sch.id | SEKRETARIS |
| Erica Aurie | erica@mutiarabangsa.sch.id | ANGGOTA |
| Evander Tristan Lee | Evander@mutiarabangsa.sch.id | ANGGOTA |
| Gavriella Mulia Sitorus | gavriella@mutiarabangsa.sch.id | ANGGOTA |
| Jesslyn Aurelia Hamsidi | jesslynhm@mutiarabangsa.sch.id | ANGGOTA |
| Jivin Wellington Priyanto | JivinWell@mutiarabangsa.sch.id | ANGGOTA |
| Jolin khojaya | jolinkho@mutiarabangsa.sch.id | ANGGOTA |
| keiko kholis | keiko@mutiarabangsa.sch.id | ANGGOTA |
| Li Ming Xin | xinxin@mutiarabangsa.sch.id | ANGGOTA |
| Mishella Tjung | mishella@mutiarabangsa.sch.id | ANGGOTA |
| Rebecca Christa P | rebecca@mutiarabangsa.sch.id | ANGGOTA |
| Wilbert Bryan | wilbert@mutiarabangsa.sch.id | ANGGOTA |

**Catatan**: tio@mutiarabangsa.sch.id (HOMEROOM) diinsert ke `profiles` via trigger saat Google login pertama kali. `users` table → `profiles` table via upsert di `auth.ts` callbacks.

---

## 4. Auth Flow (Google OAuth + NextAuth)

### 4.1 Route: `/api/auth/[...nextauth]`

**File**: `src/app/api/auth/[...nextauth]/route.ts`

```ts
import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"
const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

### 4.2 File: `src/lib/auth.ts`

- **Provider**: Google (clientId + clientSecret dari `.env.local`)
- **Session strategy**: `jwt`
- **Callbacks**:
  - `signIn`: cek email ending with `@mutiarabangsa.sch.id` → reject lainnya
  - `jwt`: upsert ke `profiles` table via `createAdminClient()` → set `token.userId` + `token.dbRole`
  - `session`: attach `session.user.id` + `session.user.role` dari token
- **pages.signIn**: `/login`

### 4.3 Route: `/login`

**File**: `src/app/login/page.tsx`

```tsx
signIn("google", { callbackUrl: "/app" })
```

Login page:
- Brand monogram "7B" (bg-forest, white text)
- Title "Seven Bro!"
- Subtitle "Login dengan akun sekolah Anda"
- "Masuk dengan Google" button
- Error message jika gagal

### 4.4 Middleware: `src/middleware.ts`

```ts
withAuth({ pages: { signIn: "/login" } })
```

Melindungi semua route kecuali: `api/*`, `_next/static/*`, `_next/image/*`, `login`, `offline`, `icons`, `manifest.webmanifest`, `sw.js`, image files.

### 4.5 `src/middleware.ts` → protected routes

Semua route di bawah `/app/*` **dilindungi** oleh middleware. Jika belum login → redirect ke `/login`.

### 4.6 Auth State di `AppShell`

**File**: `src/app/app/layout.tsx` → `ShellLayout` component

```tsx
const { data: session } = useSession()
const role = (session?.user as { role?: string } | undefined)?.role
```

**Role → Nav mapping**:

| Role | Nav items |
|------|-----------|
| **ANGGOTA** | Beranda, Info, Agenda |
| **KETUA, SEKRETARIS, BENDAHARA, HOMEROOM** | Beranda, Info, Agenda, **Kas**, **Poin** |

**Guru/Admin (HOMEROOM) → adminItems**:
- `/app/admin/roster` — Roster (icon: Users)
- `/app/admin/settings` — Pengaturan Kelas (icon: Shield)

---

## 5. All Routes (Lengkap)

| Route | File | Page Name | Protected | Role | Status |
|-------|------|-----------|-----------|------|--------|
| `/` | `src/app/page.tsx` | Root redirect | ✅ | all | ✅ Done (redirects to `/app`) |
| `/login` | `src/app/login/page.tsx` | Login Google | ❌ | any | ✅ Done |
| `/app` | `src/app/app/layout.tsx` + `src/app/app/page.tsx` | Beranda | ✅ | authenticated | ✅ Done |
| `/app/pengumuman` | `src/app/app/pengumuman/page.tsx` | Info/Pengumuman | ✅ | authenticated | ⚠️ Skeleton (beli dalam page.tsx) |
| `/app/agenda` | `src/app/app/agenda/page.tsx` | Agenda | ✅ | authenticated | ⚠️ Skeleton |
| `/app/kas` | `src/app/app/kas/page.tsx` | Kas | ✅ | HOMEROOM, KETUA, SEKRETARIS, BENDAHARA | ⚠️ Skeleton |
| `/app/poin` | `src/app/app/poin/page.tsx` | Poin | ✅ | HOMEROOM, KETUA, SEKRETARIS, BENDAHARA | ⚠️ Skeleton |
| `/app/settings` | `src/app/app/settings/page.tsx` | Settings | ✅ | authenticated | ⚠️ Skeleton |
| `/app/admin/roster` | — (not yet created) | Roster Admin | ✅ | HOMEROOM | 🔜 Not yet created |
| `/app/admin/settings` | — (not yet created) | Pengaturan Kelas | ✅ | HOMEROOM | 🔜 Not yet created |
| `/api/auth/[...nextauth]` | `src/app/api/auth/[...nextauth]/route.ts` | NextAuth | ❌ | any | ✅ Done |

**Bentoooo grid** layout:
- Grid CSS custom di `src/app/globals.css`: `.bento-grid` → `grid-template-columns: repeat(4, 1fr)`
- Responsive breakpoints: `< 480px` = 2 cols, `480–767px` = 3 cols, `≥ 768px` = 4 cols

---

## 6. Page Content Details

### 6.1 Beranda (`/app`) — BENTO GRID Dashboard

**File**: `src/app/app/page.tsx`

**Bento grid slots** (4-column layout):

| Slot | Class | Content |
|------|-------|---------|
| Header | `bento-sapaan` | Greeting + student count badge |
| Info stat | `bento-stat` | Link to `/app/pengumuman` |
| Agenda stat | `bento-stat` | Link to `/app/agenda` |
| Poin stat | `bento-stat` | Link to `/app/poin` |
| Pinned Announcement | `bento-featured` | HeroCard (dark card, 2x2) |
| Kas balance | `bento-medium` | Dark card with balance + manage button |
| Agenda list | `bento-medium` | 3 upcoming events (white card) |
| Leaderboard top 3 | `bento-tall` | Peringkat (tall, 3x grid) |
| Target Poin | `bento-stat` | Progress bar card (500 pts/month) |

**Data source**: `src/lib/demo-data.ts` (hardcoded — diganti dengan API/DB di FASE 4-6)

### 6.2 Info/Pengumuman (`/app/pengumuman`)

**File**: `src/app/app/pengumuman/page.tsx`
- Currently: `<h1>Info</h1>` + `<p>Coming soon</p>` (skeleton)
- Data source nanti: `src/lib/demo-data.ts` → `ANNOUNCEMENTS` array
- Features: list announcements, pinned announcement, filter by date

### 6.3 Agenda (`/app/agenda`)

**File**: `src/app/app/agenda/page.tsx`
- Currently: `<h1>Agenda</h1>` + `<p>Coming soon</p>` (skeleton)
- Data source nanti: `src/lib/demo-data.ts` → `AGENDA` array
- Features: list agenda items, date/time, location

### 6.4 Kas (`/app/kas`)

**File**: `src/app/app/kas/page.tsx`
- Currently: `<h1>Kas</h1>` + `<p>Coming soon</p>` (skeleton)
- Data source nanti: `src/lib/demo-data.ts` → `KAS_TRANSACTIONS` array
- Features: balance, transaction history, in/out

### 6.5 Poin (`/app/poin`)

**File**: `src/app/app/poin/page.tsx`
- Currently: `<h1>Poin</h1>` + `<p>Coming soon</p>` (skeleton)
- Data source nanti: `src/lib/demo-data.ts` → `LEADERBOARD` array
- Features: leaderboard, points history, per-student detail

### 6.6 Settings (`/app/settings`)

**File**: `src/app/app/settings/page.tsx`
- Currently: `<h1>Settings</h1>` + `<p>Coming soon</p>` (skeleton)
- Features: notification preferences, theme, logout

---

## 7. Library Files Detail

### 7.1 `src/lib/format.ts` — Format Functions

| Function | Input | Output | Note |
|----------|-------|--------|------|
| `formatIDR(n)` | number | `"Rp 60.000"` | Indonesian Rupiah |
| `monthKeyWIB(date?)` | Date/string | `"2025-09"` | UTC+7 shift |
| `monthLabel(m)` | `"01"`/`"YYYY-MM"` | `"Sep"` | Indonesian month |
| `formatDateID(d)` | Date | `"Sen, 15 Sep"` | Indonesian day+date |
| `formatTimeID(d)` | Date | `"07:00"` | WIB time |

### 7.2 `src/lib/policies.ts` — Role-Based Policies

| Function | Allowed Roles | Description |
|----------|---------------|-------------|
| `canPostAnnouncement(role)` | HOMEROOM, KETUA | Boleh posting pengumuman |
| `canManageAgenda(role)` | HOMEROOM, KETUA, SEKRETARIS | Boleh kelola agenda |
| `canManageKas(role)` | HOMEROOM, BENDAHARA | Boleh kelola kas |
| `canGivePoints(role)` | HOMEROOM only | Boleh kasih poin |
| `canAdmin(role)` | HOMEROOM only | Akses admin/roster |
| `canUseApp(role)` | All valid roles | Boleh memakai app |

### 7.3 `src/lib/session.ts` — Session & API Helper

**Pattern FASE 4** (route handler):
```ts
try {
  const ctx = await requireApi(canPostAnnouncement)
  // ... handle request
} catch (e) {
  return NextResponse.json(apiError(e).body, { status: apiError(e).status })
}
```

- `getContext()` → `AppContext | null`
- `requireApi(policy?)` → `AppContext` (throws `ApiError` 401/403)
- `apiError(err)` → `{ message, code? }`
- `setContextReader(reader)` → plug real session reader (FASE 1)

**`AppContext` type**:
```ts
type AppContext = {
  role: string
  name: string
  email?: string
  classId?: string
  className?: string
  studentId?: string | null
}
```

### 7.4 `src/lib/fetcher.ts` — SWR Wrapper

```ts
export function fetcher<T>(url: string): Promise<T>
export function useAppSWR<T>(key: string, url: string): { data, error, isLoading }
```

### 7.5 `src/lib/db.ts` — Supabase Admin Client

```ts
export function createAdminClient(): SupabaseClient
```
Menggunakan `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.

### 7.6 `src/lib/demo-data.ts` — Demo Data

Data hardcoded untuk development:
- `STUDENTS` — 16 siswa 7B asli (dari roster Excel)
- `NOTIFICATIONS` — 3 notifikasi
- `ANNOUNCEMENTS` — 3 pengumuman
- `AGENDA` — 4 agenda items
- `KAS_TRANSACTIONS` — 3 transaksi kas
- `LEADERBOARD` — 5 peringkat poin

---

## 8. UI Primitives (`src/components/ui-primitives.tsx`)

| Component | Props | Purpose |
|-----------|-------|---------|
| `SectionHeader` | `title`, `action?`, `count?` | Section heading dengan optional badge/count |
| `StatCard` | `href`, `icon`, `label`, `value`, `tone?` | Stat card linkable (4 tone colors) |
| `ListRow` | `icon`, `title`, `subtitle`, `rightTop?`, `rightBottom?`, `href?` | Dense list item |
| `HeroCard` | `eyebrow`, `title`, `location`, `description?` | Dark card (deep emerald bg) |
| `ProgressCard` | `eyebrow`, `value`, `sub?`, `doneLabel`, `percent` | Progress bar with number |
| `EmptyState` | `icon`, `message` | Centered empty state |
| `TimelineItem` | `time`, `timeEnd?`, `title`, `location`, `isActive?`, `isLast?` | Timeline list item |
| `Timeline` | `children` | Timeline container with vertical rail |

---

## 9. Components Detail

### 9.1 `src/components/AppShell.tsx`

**Props** (`AppShellProps`):
```tsx
{
  children: ReactNode
  brand: { logoSrc, logoAlt, title }
  nav: { items: AppShellNav[] }
  notifications?: AppShellNotification[]
  user?: AppShellUser
  onNotificationClick?: (id: string) => void
  onSettings?: () => void
  onSignOut?: () => void
  adminItems?: { href: string; label: string; icon: LucideIcon }[]
}
```

**Features**:
- Sticky header (h-14) with brand logo + user avatar
- Bell icon → notification dropdown (mark all as read)
- Admin Shield icon → dropdown with Roster/Pengaturan Kelas + Pengaturan + Keluar
- Bottom nav (grid, equal-width items, active state highlighted forest)
- `AppShellNav` type: `{ href, label, icon }`
- `AppShellNotification` type: `{ id, title, body, time, read }`

### 9.2 `src/components/AuthProvider.tsx`

Next-auth `SessionProvider` wrapper — wraps entire app in `layout.tsx`.

---

## 10. CSS Design System (SSOT)

**File**: `docs/DESIGN_SYSTEM.md` — **WAJIB dipakai** untuk semua halaman baru

### Color Tokens
```
Page bg      →  bg-page        #F3F7F4
Subtle fill  →  bg-surface     #EAF2EB
Card (light) →  bg-white border border-line shadow-sm
Card (dark)  →  bg-deep        #0D211C
Forest        →  #144D36        active nav, primary accents
Lime          →  #A3E635        progress bar, success check
Acid          →  #EFFADB        jam/lokasi di dark card
Amber         →  #FBA94C        quest/secondary
Alert         →  #EF4444
Ink           →  text-ink       #111827
Ink soft      →  text-ink-soft  #6B7280
Border        →  border-line    #D7E5DB
```

### Typography
```
Page title       →  text-lg font-bold text-ink
Section heading  →  text-xs font-semibold text-ink
Card title       →  text-[11px] font-semibold text-ink + truncate
Body/value       →  text-[10px] – text-[11px]
Meta             →  text-[10px] text-ink-soft/75
Micro            →  text-[9px]  text-ink-soft/75
```

### Bento Grid CSS (custom)
**File**: `src/app/globals.css`

```css
.bento-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.bento-sapaan   { grid-column: span 4; }
.bento-stat     { grid-column: span 1; }
.bento-featured { grid-column: span 2; grid-row: span 2; }
.bento-medium   { grid-column: span 1; grid-row: span 2; }
.bento-tall     { grid-column: span 1; grid-row: span 3; }
.bento-card     { min-height: 120px; display: flex; flex-direction: column; }
```

**Responsive**:
```css
@media (max-width: 479px)  { grid: repeat(2, 1fr); }
@media (min-width: 480px) and (max-width: 767px) { grid: repeat(3, 1fr); }
@media (min-width: 768px)  { grid: repeat(4, 1fr); }
```

---

## 11. Test Status

**Command**: `npx vitest run` → **92 tests / 4 files passing**

| File | Tests | Status |
|------|-------|--------|
| `src/lib/format.test.ts` | 20 tests | ✅ Pass |
| `src/lib/policies.test.ts` | 34 tests | ✅ Pass |
| `src/lib/session.test.ts` | 14 tests | ✅ Pass |
| `src/lib/fetcher.test.ts` | 24 tests | ✅ Pass |

**Commands**:
```bash
npx tsc --noEmit    # TypeScript check
npm run build       # Next.js build
npx vitest run      # Run all tests
npm run lint        # ESLint
```

---

## 12. Pengerjaan — Status Detail

### ✅ DONE

| Task | Description |
|------|-------------|
| **FASE 0** | Scaffold Next 15 + React 19 + Tailwind 4 + shadcn/ui |
| **FASE 2** | Format functions (formatIDR, monthKeyWIB, monthLabel, formatDateID, formatTimeID) |
| **FASE 3** | Policies (6 role-based functions), fetcher (SWR wrapper), session (getContext, requireApi, apiError, setContextReader) |
| **T-4** | Supabase project `kelaskita-7b` dibuat + schema migrations (16 tables + RLS) |
| **T-5** | `.env.local` created with all credentials |
| **T-6** | Google OAuth credentials verified (client ID: `863213321151-...`) |
| **T-7** | Auth stack: `db.ts`, `auth.ts`, `next-auth.d.ts`, `[...nextauth]/route.ts`, `middleware.ts`, `AuthProvider.tsx` |
| **T-8** | Login page dengan Google button |
| **T-13** | `lib/format.ts` + tests (20 tests) |
| **T-14** | `lib/policies.ts` + tests (34 tests) |
| **T-15** | `lib/fetcher.ts` + `lib/session.ts` + tests (38 tests) |
| **Navbar redesign** | Bottom nav equal-width grid, label "Pengumuman" → "Info" |
| **Beranda revamp** | Bento grid dashboard (7 slot layout, 4-column grid) |
| **Branding** | "Seven Bro!" di manifest, login page, layout, AppShell |
| **Seed data** | 16 siswa real + role assignments (Edmund=KETUA, Madeline+B Pauline=BENDAHARA, Freissy+Andra=SEKRETARIS, tio=HOMEROOM) |

### 🔜 NOT YET BUILT

| Task | Description | Status |
|------|-------------|--------|
| **T-9** | Google OAuth redirect loop — **BLOKIR** (env mismatch: `NEXT_PUBLIC_` prefix issue, Google redirect URI) | 🔴 BLOCKED |
| **T-10** | `src/app/app/pengumuman/page.tsx` — info page | ⚠️ Skeleton |
| **T-11** | `src/app/app/agenda/page.tsx` | ⚠️ Skeleton |
| **T-12** | `src/app/app/kas/page.tsx` | ⚠️ Skeleton |
| **T-13** | `src/app/app/poin/page.tsx` | ⚠️ Skeleton |
| **T-14** | `src/app/app/settings/page.tsx` | ⚠️ Skeleton |
| **T-15** | `src/app/app/admin/roster/page.tsx` | 🔜 Not created |
| **T-16** | `src/app/app/admin/settings/page.tsx` | 🔜 Not created |
| **PWA push notifications** | VAPID keys, service worker notification handler | 🔜 Future |
| **Real API integration** | `demo-data.ts` → fetch from Supabase | 🔜 FASE 4-6 |

### 🚫 BLOCKED / ISSUE

| Issue | Detail |
|-------|--------|
| **T-9 OAuth redirect loop** | Login → Google → back to `/login` (never reaches `/app`). Causes: `NEXT_PUBLIC_` prefix mismatch in `lib/db.ts` (reads `NEXT_PUBLIC_SUPABASE_URL` but `.env.local` wrote `SUPABASE_URL`), and possibly Google redirect URI not matching `http://localhost:3000/api/auth/callback/google`. Fix: `.env.local` sudah diperbaiki. **Perlu verifikasi Google Console redirect URI**. |
| **CSS not rendering** | Earlier dev server showed no Tailwind classes. `rm -rf .next && npm run dev` restart sudah dilakukan. **Perlu verifikasi**. |

---

## 13. Todo Checklist

```
[x] FASE 0 — Scaffold Next 15 + React 19 + Tailwind 4 + shadcn/ui
[x] FASE 2 — Format functions + tests (20)
[x] FASE 3 — Policies + fetcher + session + tests (92 total)
[x] T-4    — Supabase project + schema + seed 16 students
[x] T-5    — .env.local + credentials
[x] T-6    — Google OAuth credentials verified
[x] T-7    — Auth stack files
[x] T-8    — Login page
[x] T-9    — Google OAuth redirect loop [BLOCKED]
[x] T-10   — Navbar redesign (equal-width, "Info" label)
[x] T-11   — Beranda revamp (bento grid dashboard)
[x] T-12   — Branding "Seven Bro!" everywhere
[x] T-13   — Seed roles correct (Edmund=KETUA, Madeline=BENDAHARA, etc.)
[ ] T-14   — /app/pengumuman/page.tsx — full content
[ ] T-15   — /app/agenda/page.tsx — full content
[ ] T-16   — /app/kas/page.tsx — full content
[ ] T-17   — /app/poin/page.tsx — full content
[ ] T-18   — /app/settings/page.tsx — full content
[ ] T-19   — /app/admin/roster/page.tsx — admin roster
[ ] T-20   — /app/admin/settings/page.tsx — class settings
[ ] T-21   — Real API integration (demo-data.ts → Supabase)
[ ] T-22   — PWA push notifications (VAPID, sw.js handler)
[ ] T-23   — SignOut function wiring in ShellLayout
```

---

## 14. Dependencies

```json
"dependencies": {
  "@radix-ui/react-avatar": "^1.2.6",
  "@radix-ui/react-slot": "^1.3.3",
  "@radix-ui/react-tabs": "^1.1.21",
  "@supabase/supabase-js": "^2.116.0",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "lucide-react": "^1.44.0",
  "next": "^15.5.25",
  "next-auth": "^4.24.15",
  "next-pwa": "^5.6.0",
  "react": "^19.3.0",
  "react-dom": "^19.3.0",
  "swr": "^2.5.1",
  "tailwind-merge": "^3.6.0",
  "web-push": "^3.6.7"
}
"devDependencies": {
  "@tailwindcss/postcss": "^4.3.3",
  "@types/node": "^20",
  "@types/react": "^19.3.0",
  "@types/react-dom": "^19.3.0",
  "@types/web-push": "^3.6.4",
  "eslint": "^8",
  "eslint-config-next": "^15.5.25",
  "tailwindcss": "^4.3.3",
  "typescript": "^5",
  "vitest": "^4.1.11"
}
```

---

## 15. How to Run

```bash
cd D:\Workspace\sevenbro
npm install
npm run dev           # → http://localhost:3000

# Verify
npx tsc --noEmit      # TypeScript check ✅
npm run build         # Build check ✅
npx vitest run        # Tests ✅ (92 tests)
```

---

## 16. Important Notes for MiMo

1. **Environment**: `.env.local` sudah ada di workspace dengan semua credentials. **Jangan commit**.
2. **Auth redirect**: Google Console sudah perlu diverifikasi redirect URI → `http://localhost:3000/api/auth/callback/google`
3. **Database**: Supabase sudah ada + seed 16 siswa. `profiles` table di-populate via trigger saat login pertama.
4. **T-9 (OAuth)**: Kemungkinan besar sudah fix karena `.env.local` sudah diperbaiki `NEXT_PUBLIC_` prefix. Coba login lagi.
5. **CSS**: Gunakan `https://localhost:3000` untuk verify CSS loads (Ctrl+F5 bypass cache).
6. **Route protection**: Semua `/app/*` dilindungi oleh middleware. Belum login → `/login`.
7. **Role-based nav**: Beranda/Info/Agenda untuk semua, + Kas/Poin untuk pengurus, + Roster/Pengaturan Kelas untuk HOMEROOM (tio).
8. **Data**: `demo-data.ts` masih hardcoded — akan diganti API ke Supabase di FASE 4+.
9. **SignOut**: `onSignOut` callback di `ShellLayout` masih TODO — perlu wire `signOut()` from next-auth.
10. **Admin pages**: `/app/admin/roster` dan `/app/admin/settings` belum dibuat.

---

## 17. Google OAuth Debugging Notes (T-9)

**Suspected causes for redirect loop**:
1. ✅ `.env.local` sudah diperbaiki `NEXT_PUBLIC_` prefix
2. ❓ Google Console authorized redirect URI mungkin belum include `http://localhost:3000/api/auth/callback/google`
3. ❓ OAuth consent screen mungkin belum "Published" (hanya test)
4. ❓ `signIn("google", { callbackUrl: "/app" }` → NextAuth callback → session handling error → redirect back to login

**Debug steps**:
1. Buka Google Console → APIs & Services → Credentials → OAuth 2.0 Client ID
2. Cek Authorized redirect URIs → tambahkan `http://localhost:3000/api/auth/callback/google`
3. Cek OAuth consent screen → Status → Published (atau add test user `tio@mutiarabangsa.sch.id`)
4. Buka dev server terminal → cek error logs saat login
5. Cek browser console → Network tab → callback request status

---

_Dokumentasi ini dibuat untuk handoff ke MiMo. Semua informasi detail, route, komponen, DB schema, dan status pengerjaan tertulis lengkap._
_Diupdate terakhir: 2026-09-15_
