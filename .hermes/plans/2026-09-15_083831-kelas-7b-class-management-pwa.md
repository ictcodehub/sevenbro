# Plan — KelasKita 7B: Aplikasi Manajemen Kelas (PWA native-feel)

> Disusun 2026-09-15, hasil brainstorming + 4 pertanyaan klarifikasi yang sudah dijawab user.
> Target implementer: zero context. Semua keputusan sudah final — jangan menebak.

## 1. Goal

Membangun **KelasKita** — PWA manajemen kelas untuk homeroom & 32-an siswa kelas 7B Mutiara Bangsa 2 JHS, dengan 3 fitur inti (Kas, Pengumuman+Agenda, Poin Perilaku), login Google akun sekolah, dan push notification, yang terasa seperti aplikasi native di HP.

## 2. Hasil Brainstorming (keputusan user, sudah dikonfirmasi)

### 2.1 Fitur MVP (WAJIB rilis pertama)

| Fitur | Detail | Pengelola |
|---|---|---|
| **Kas Kelas** | Iuran bulanan per siswa (nominal per bulan diatur), transaksi pemasukan/pengeluaran manual, saldo otomatis, status bayar transparan (siswa lihat status sendiri + rekap kelas) | Bendahara + Homeroom |
| **Pengumuman & Agenda** | Noticeboard (pin/unpin) + agenda kegiatan (judul, lokasi, waktu) | Homeroom + Ketua (+Sekretaris untuk agenda) |
| **Poin Perilaku/Prestasi** | Homeroom beri/kurangi poin per siswa dengan alasan; leaderboard + histori per siswa | Homeroom (beri), semua (lihat) |
| **Push Notification** | Notif saat pengumuman baru + reminder iuran harian (user pilih masuk MVP) | Sistem |
| **Manajemen Anggota** | Roster siswa (tambah massal), penetapan posisi (ketua/bendahara/sekretaris/anggota), pengaitan akun Google baru login → siswa | Homeroom |

### 2.2 Backlog Fase 2 (JANGAN dibangun sekarang — YAGNI)

Presensi harian, tugas/deadline, galeri foto kegiatan, polling/aspirasi, export laporan PDF, aktivasi kelas lain (UI multi-kelas), chat.

### 2.3 Matriks role (sumber kebenaran tunggal)

Role efektif dihitung per-request: `users.role=HOMEROOM` → HOMEROOM; email cocok `students.email` → position siswa (KETUA/BENDAHARA/SEKRETARIS/ANGGOTA); selain itu PENDING (layar "menunggu aktivasi").

| Kemampuan | HOMEROOM | KETUA | BENDAHARA | SEKRETARIS | ANGGOTA |
|---|---|---|---|---|---|
| Lihat semua data kelas | ✅ | ✅ | ✅ | ✅ | ✅ |
| Buat/edit pengumuman | ✅ | ✅ | ❌ | ❌ | ❌ |
| Kelola agenda | ✅ | ✅ | ❌ | ✅ | ❌ |
| Kelola kas (transaksi, iuran, tandai bayar) | ✅ | ❌ | ✅ | ❌ | ❌ |
| Beri/kurangi poin | ✅ | ❌ | ❌ | ❌ | ❌ |
| Admin (roster, role, pengaitan akun) | ✅ | ❌ | ❌ | ❌ | ❌ |

PENDING tidak bisa masuk app sama sekali (hanya layar tunggu).

## 3. Tech Stack & Infrastruktur (final)

| Lapisan | Pilihan | Kenapa |
|---|---|---|
| Framework | **Next.js 15 App Router + React 19 + TypeScript** | Pola terbukti di mesin ini (app Trip), SSR cepat, route handlers untuk API |
| UI | **Tailwind v4 + shadcn-style components manual** (di `src/components/ui-primitives.tsx`) | Preferensi user (tolak Ionic/Astryx); mobile-first, radius besar, teks compact — semua konvensi UI user ada di skill `nextjs-scaffold` |
| Auth | **NextAuth v4 Google Provider**, restrict `@mutiarabangsa.sch.id`, session JWT | Siswa & guru sudah punya akun Google sekolah (dipakai app Trip) |
| Database | **Supabase Postgres** (project BARU `kelaskita-7b`, region ap-southeast-1) | Free, Postgres asli, kelola via Supabase MCP yang sudah terpasang di Hermes |
| Data access | Semua via **route handlers Next.js + service_role key** (server-side only). TIDAK pakai RLS/anon key dari browser | Satu sumber authz (NextAuth), pola terbukti di app Trip. RLS di-skip karena anon key tak dipakai |
| PWA | **@serwist/next v9** (precache app shell + offline fallback) + `manifest.webmanifest` + icons maskable | Serwist = pengganti next-pwa yang kompatibel Next 15 |
| Push | **web-push (VAPID)** di Node runtime + **Vercel cron** harian untuk reminder iuran | Lebih sederhana daripada Edge Function Deno + pg_cron; cron harian cukup di Vercel Hobby |
| Hosting | **Vercel** (akun `kirimtugas`, sudah login via CLI) | Zero-config Next, HTTPS otomatis (wajib PWA/push), URL `*.vercel.app` |
| Icons | **Python + Pillow** script sekali jalan | ImageMagick tidak ada di mesin; sharp berisiko EALLOWSCRIPTS |
| Test | **Vitest** untuk pure functions (policies, format) | TDD di logika murni; UI diverifikasi typecheck+build+curl+manual |

**Gotcha mesin ini (WAJIB diikuti, dari skill `nextjs-scaffold`):**
- `npx create-next-app` / `npx shadcn init` GAGAL (npm EALLOWSCRIPTS) → scaffold manual, `.npmrc` berisi `allow-scripts=true` saat install pertama, **hapus setelahnya**.
- OAuth redirect lokal WAJIB `http://localhost:3000/api/auth/callback/google` (port 3000 exact, tanpa trailing slash) → dev server harus di 3000; matikan dev server lain yang pegang 3000.
- NextAuth upsert **tidak boleh menyertakan `role`** (akan menimpa role DB) → di sini dilarang oleh trigger + payload tanpa role.
- Table `users` harus ada **sebelum** test login (auth gagal diam-diam kalau belum).

## 4. Arsitektur

```
[HP siswa/guru]  PWA (installable, offline shell, push)
      │ HTTPS
      ▼
[Vercel] Next.js 15
   ├─ (app) pages  ── server components ──┐
   ├─ /api/* route handlers ────────────►│ service_role
   ├─ middleware (next-auth/middleware)   ▼
   └─ sw.js (Serwist)              [Supabase Postgres]
   vercel.json cron ──► /api/cron/dues-reminder ──► web-push (VAPID)
```

- **Authz**: middleware cek login saja; otorisasi role di route handler via `requireApi(policyFn)` + policy pure functions.
- **Role efektif selalu segar** (dihitung dari DB per-request) → admin ubah posisi siswa, efek langsung tanpa re-login.
- **Uang = integer rupiah** (tanpa sen). Bulan = string `YYYY-MM` key WIB.

### 4.1 Struktur direktori final (project root: `D:/Workspace/kelaskita`)

```
kelaskita/
├─ .env.local                      # rahasia (gitignored)
├─ .gitignore
├─ .npmrc                          # HANYA saat install pertama, dihapus setelahnya
├─ next.config.ts                  # withSerwist
├─ postcss.config.mjs
├─ vercel.json                     # cron
├─ vitest.config.ts
├─ tsconfig.json
├─ package.json
├─ docs/DESIGN_SYSTEM.md           # SSOT desain
├─ public/
│  ├─ manifest.webmanifest
│  ├─ apple-touch-icon.png
│  ├─ icons/icon-192.png icon-512.png maskable-512.png badge-72.png
│  └─ sw.js                        # hasil build (gitignored)
├─ scripts/gen_icons.py
├─ supabase/migrations/001_init.sql 002_seed.sql
└─ src/
   ├─ middleware.ts
   ├─ types/next-auth.d.ts
   ├─ app/
   │  ├─ layout.tsx  globals.css
   │  ├─ login/page.tsx
   │  ├─ offline/page.tsx
   │  ├─ admin/page.tsx
   │  ├─ (app)/                    # semua halaman login-only
   │  │  ├─ layout.tsx              # DashboardShell
   │  │  ├─ page.tsx                # Beranda  → URL "/"
   │  │  ├─ pengumuman/page.tsx  pengumuman/[id]/page.tsx
   │  │  ├─ agenda/page.tsx
   │  │  ├─ kas/page.tsx  kas/iuran/[monthId]/page.tsx
   │  │  ├─ poin/page.tsx
   │  │  └─ saya/page.tsx
   │  ├─ sw.ts                     # source service worker (Serwist)
   │  └─ api/
   │     ├─ auth/[...nextauth]/route.ts
   │     ├─ announcements/route.ts  announcements/[id]/route.ts
   │     ├─ events/route.ts  events/[id]/route.ts
   │     ├─ kas/summary/route.ts  kas/transactions/route.ts  kas/transactions/[id]/route.ts
   │     ├─ kas/months/route.ts  kas/months/[id]/route.ts  kas/payments/route.ts  kas/payments/[id]/route.ts
   │     ├─ points/route.ts
   │     ├─ admin/students/route.ts  admin/students/[id]/route.ts  admin/users/[id]/link/route.ts
   │     ├─ push/subscribe/route.ts  push/test/route.ts
   │     └─ cron/dues-reminder/route.ts
   ├─ components/
   │  ├─ ui-primitives.tsx          # Button Card Badge PageHeader StatCard EmptyState Skeleton
   │  ├─ DashboardShell.tsx        # bottom nav 5 tab + header
   │  └─ AuthProvider.tsx
   └─ lib/
      ├─ auth.ts  session.ts  db.ts  policies.ts  format.ts  fetcher.ts  push.ts
      └─ __tests__/policies.test.ts  format.test.ts
```

### 4.2 Konvensi

- **Bahasa UI: Indonesia** penuh (label, tombol, toast, error).
- Desain: mobile-first 390px dulu; radius 16px; body `text-xs`, heading `text-sm`, label `text-[10px]`; judul card selalu `truncate` 1 baris; jarak vertikal `space-y-4` max, card `p-3`; 1 kartu aksen besar + 2 kartu kecil untuk statistik; font **Inter**; warna utama **emerald** (`hsl(160 84% 28%)` ≈ #0b8a5c); ikon **lucide-react**; bottom nav 5 item (Beranda `Home`, Pengumuman `Megaphone`, Agenda `CalendarDays`, Kas `Wallet`, Poin `Trophy`).
- Nomor halaman app = client-side nav Next (prefetch bawaan) — terasa native.
- Commit konvensional per task (`feat(kas): ...`), commit kecil-kecil.
- Semua query selalu filter `.eq("class_id", ctx.classId)` — warisan multi-kelas.

### 4.3 Skema Database — `supabase/migrations/001_init.sql` (LENGKAP)

```sql
create extension if not exists pgcrypto;

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  school text not null default 'Mutiara Bangsa 2 Junior High School',
  homeroom_email text not null,
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text,
  role text not null default 'PENDING' check (role in ('HOMEROOM','STUDENT','PENDING')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  full_name text not null,
  nis text,
  email text unique,
  position text not null default 'ANGGOTA' check (position in ('KETUA','BENDAHARA','SEKRETARIS','ANGGOTA')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.dues_months (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  month_key text not null,
  amount integer not null check (amount >= 0),
  title text not null,
  created_by text not null,
  created_at timestamptz not null default now(),
  unique (class_id, month_key)
);

create table public.dues_payments (
  id uuid primary key default gen_random_uuid(),
  month_id uuid not null references public.dues_months(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  amount integer not null check (amount > 0),
  paid_at timestamptz not null default now(),
  recorded_by text not null,
  note text,
  unique (month_id, student_id)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  kind text not null check (kind in ('IN','OUT')),
  category text not null,
  amount integer not null check (amount > 0),
  description text not null,
  occurred_on date not null default current_date,
  recorded_by text not null,
  created_at timestamptz not null default now()
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  body text not null,
  pinned boolean not null default false,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes(id) on delete cascade,
  title text not null,
  location text,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table public.points (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  kind text not null check (kind in ('PRESTASI','PELANGGARAN')),
  delta integer not null check (delta <> 0),
  reason text not null,
  created_by text not null,
  created_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  user_email text not null,
  created_at timestamptz not null default now()
);

create index idx_students_class on public.students(class_id);
create index idx_points_student on public.points(student_id);
create index idx_announcements_class on public.announcements(class_id, created_at desc);
create index idx_events_class_starts on public.events(class_id, starts_at);

-- Trigger: role otomatis saat login (upsert TANPA role — NextAuth tidak mengirim role)
create or replace function public.sync_user_role() returns trigger as $$
begin
  if new.role <> 'PENDING' then
    return new; -- jangan pernah menurunkan HOMEROOM/STUDENT
  end if;
  if exists (select 1 from public.classes c where c.homeroom_email = new.email) then
    new.role := 'HOMEROOM';
  elsif exists (select 1 from public.students s where s.email = new.email) then
    new.role := 'STUDENT';
  end if;
  return new;
end $$ language plpgsql;

create trigger trg_sync_user_role
before insert or update of email on public.users
for each row execute function public.sync_user_role();

-- View: saldo kas per kelas
create or replace view public.class_cash_summary as
select c.id as class_id,
  ( coalesce((select sum(dp.amount) from public.dues_payments dp
              join public.dues_months dm on dm.id = dp.month_id where dm.class_id = c.id), 0)
  + coalesce((select sum(t.amount) from public.transactions t
              where t.class_id = c.id and t.kind = 'IN'), 0)
  - coalesce((select sum(t.amount) from public.transactions t
              where t.class_id = c.id and t.kind = 'OUT'), 0)
  )::bigint as balance
from public.classes c;

-- View: total poin per siswa (untuk leaderboard)
create or replace view public.student_points_total as
select s.id as student_id, s.class_id, s.full_name, s.position,
  coalesce(sum(p.delta), 0)::int as total_points
from public.students s
left join public.points p on p.student_id = s.id
group by s.id;

-- View: status iuran per bulan (siswa × pembayaran)
create or replace view public.month_payment_status as
select dm.id as month_id, dm.class_id, dm.month_key, dm.amount as month_amount,
       s.id as student_id, s.full_name, s.position,
       dp.id as payment_id, coalesce(dp.amount, 0) as paid_amount, dp.paid_at
from public.dues_months dm
cross join public.students s
left join public.dues_payments dp on dp.month_id = dm.id and dp.student_id = s.id
where s.active;
```

`supabase/migrations/002_seed.sql` (data awal — homeroom email user; kalau bukan `tio@mutiarabangsa.sch.id`, ganti sebelum run):

```sql
insert into public.classes (name, homeroom_email) values ('7B', 'tio@mutiarabangsa.sch.id');

-- siswa dev/test (boleh dihapus via admin UI nanti)
insert into public.students (class_id, full_name, email, position) values
  ((select id from public.classes where name = '7B'), 'Faeyza (dev)', 'faeyza@mutiarabangsa.sch.id', 'ANGGOTA'),
  ((select id from public.classes where name = '7B'), 'Andra (dev)',  'andra@mutiarabangsa.sch.id',  'KETUA'),
  ((select id from public.classes where name = '7B'), 'Bendahara (dev)', 'bendahara.dev@mutiarabangsa.sch.id', 'BENDAHARA');

insert into public.dues_months (class_id, month_key, amount, title, created_by)
values ((select id from public.classes where name = '7B'),
        to_char((now() at time zone 'Asia/Jakarta'), 'YYYY-MM'),
        10000, 'Iuran Bulanan', 'tio@mutiarabangsa.sch.id');
```

---

## 5. Tasks

> Konvensi tiap task: kerjakan → jalankan perintah verifikasi → hasil harus sesuai "Expected" → commit.
> Urutan WAJIB: DB (T-8) sebelum test login (T-10), karena auth gagal diam-diam tanpa table `users`.

### FASE 0 — Scaffold

**T-1. Buat project + install deps**

```bash
mkdir -p D:/Workspace/kelaskita && cd D:/Workspace/kelaskita
```

Buat `package.json` (tulis manual — JANGAN `create-next-app`):

```json
{
  "name": "kelaskita",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev -p 3000",
    "dev:stop": "npx kill-port 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "test": "vitest run",
    "typecheck": "tsc --noEmit"
  }
}
```

```bash
echo 'allow-scripts=true' > .npmrc
npm install next@^15 react@^19 react-dom@^19 next-auth@4 @supabase/supabase-js \
  swr web-push lucide-react clsx tailwind-merge class-variance-authority \
  @radix-ui/react-slot @radix-ui/react-avatar @radix-ui/react-tabs @radix-ui/react-dialog \
  @radix-ui/react-label @radix-ui/react-switch @serwist/next@^9 serwist@^9
npm install -D typescript @types/node @types/react@^19 @types/react-dom@^19 @types/web-push \
  tailwindcss @tailwindcss/postcss vitest
rm .npmrc
```

**Expected**: `npm ls next react next-auth @serwist/next web-push` menampilkan versi tanpa `UNMET`. `.npmrc` sudah terhapus (`ls .npmrc` → "No such file").

**T-2. Config files**

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022", "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true, "skipLibCheck": true, "strict": true, "noEmit": true,
    "esModuleInterop": true, "module": "esnext", "moduleResolution": "bundler",
    "resolveJsonModule": true, "isolatedModules": true, "jsx": "preserve",
    "incremental": true, "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules", "vitest.config.ts"]
}
```

`postcss.config.mjs`:
```js
const config = { plugins: { "@tailwindcss/postcss": {} } };
export default config;
```

`next.config.ts`:
```ts
import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist({});
```

`vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({
  test: { environment: "node", include: ["src/lib/__tests__/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
```

`.gitignore`:
```
node_modules/
.next/
.env*.local
.vercel/
public/sw.js
*.tsbuildinfo
next-env.d.ts
```

**T-3. git init + commit pertama**

```bash
git init && git add -A && git commit -m "chore: scaffold kelaskita (next15+react19+tailwind4+serwist)"
```

**Expected**: `git log --oneline` → 1 commit.

### FASE 1 — Supabase & Auth

**T-4. Buat project Supabase BARU** (via Hermes Supabase MCP; fallback: dashboard)

1. `mcp__supabase__list_projects` — catat apakah ada project `gsmdtqoczaihpvxpepbq` (app Trip). **Kalau limit free tier (2 project aktif) tercapai**: pause project lama via `mcp__supabase__pause_project`, atau jalankan fallback §7-R2.
2. `mcp__supabase__create_project` name=`kelaskita-7b`, region=`ap-southeast-1`, password: generate & simpan.
3. Tunggu sampai status `ACTIVE` (~2 menit) — cek `mcp__supabase__get_project`.
4. `mcp__supabase__get_project_url` → `NEXT_PUBLIC_SUPABASE_URL`; `mcp__supabase__get_publishable_keys` → anon key. **Service role key**: dashboard Supabase → project → Settings ⚙️ → API → `service_role` secret (👁️ reveal) — copy manual.
5. Apply migrations: `mcp__supabase__apply_migration` name=`001_init` query=`<isi 001_init.sql di §4.3>` lalu `002_seed`.

**Expected**: `mcp__supabase__list_tables` menampilkan 9 table (classes, users, students, dues_months, dues_payments, transactions, announcements, events, points, push_subscriptions — 10 sebenarnya, hitung!) + 3 view. `mcp__supabase__execute_sql` `select name, homeroom_email from classes;` → 1 row `7B`.

**T-5. `.env.local`**

```bash
openssl rand -base64 32   # → NEXTAUTH_SECRET
npx web-push generate-vapid-keys   # → public/private key VAPID
```

`.env.local` (nilai `<...>` diisi dari T-4/T-5 + Google OAuth T-6):
```env
NEXTAUTH_SECRET=<dari openssl>
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
GOOGLE_CLIENT_ID=<dari T-6>
GOOGLE_CLIENT_SECRET=<dari T-6>
NEXT_PUBLIC_SUPABASE_URL=<dari T-4>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dari T-4>
SUPABASE_SERVICE_ROLE_KEY=<dari T-4, rahasia>
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<dari web-push>
VAPID_PRIVATE_KEY=<dari web-push>
VAPID_SUBJECT=mailto:tio@mutiarabangsa.sch.id
CRON_SECRET=<openssl rand -base64 32 kedua>
```

**T-6. Google OAuth client** (sekali untuk dev+prod)

Google Cloud Console → (project yang sama dengan app Trip kalau ada, atau baru) → APIs & Services → Credentials → Create Credentials → OAuth Client ID → Web application:
- Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google` **dan** `https://kelaskita-7b.vercel.app/api/auth/callback/google` (nama domain final dari `vercel deploy` T-27 — kalau berbeda, update di sini).
- Copy Client ID + Secret ke `.env.local`.
- OAuth consent screen: kalau status **Testing**, tambahkan beberapa akun sekolah sebagai test user ATAU klik **Publish app** (semua akun `@mutiarabangsa.sch.id` bisa langsung pakai — rekomendasi).

**T-7. Kode auth (lengkap)**

`src/lib/db.ts`:
```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
export function createAdminClient(): SupabaseClient {
  client ??= createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
  return client;
}
```

`src/lib/auth.ts`:
```ts
import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { createAdminClient } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      return user.email?.endsWith("@mutiarabangsa.sch.id") ?? false;
    },
    async jwt({ token, account, user }) {
      if (account && user?.email) {
        const db = createAdminClient();
        const { data } = await db
          .from("users")
          .upsert({ email: user.email, name: user.name ?? null }, { onConflict: "email" })
          .select("id, role")
          .single();                       // TANPA role di payload — trigger DB yang set
        token.userId = data?.id ?? null;
        token.dbRole = data?.role ?? "PENDING";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string | null) ?? null;
        session.user.role = (token.dbRole as string) ?? "PENDING";
      }
      return session;
    },
  },
  pages: { signIn: "/login" },
};
```

`src/types/next-auth.d.ts`:
```ts
import type { DefaultSession } from "next-auth";
declare module "next-auth" {
  interface Session {
    user: { id?: string | null; role?: string } & DefaultSession["user"];
  }
}
```

`src/app/api/auth/[...nextauth]/route.ts`:
```ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

`src/middleware.ts`:
```ts
import { withAuth } from "next-auth/middleware";
export default withAuth({ pages: { signIn: "/login" } });
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|login|offline|icons|manifest.webmanifest|sw.js|apple-touch-icon.png|favicon.ico|.*\\.png$|.*\\.svg$).*)"],
};
```

`src/components/AuthProvider.tsx`:
```tsx
"use client";
import { SessionProvider } from "next-auth/react";
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

`src/lib/policies.ts` (pure — akan ditest T-13):
```ts
export type ClassRole = "HOMEROOM" | "KETUA" | "BENDAHARA" | "SEKRETARIS" | "ANGGOTA" | "PENDING";
export const canUseApp = (r: ClassRole) => r !== "PENDING";
export const canPostAnnouncement = (r: ClassRole) => r === "HOMEROOM" || r === "KETUA";
export const canManageAgenda = (r: ClassRole) => r === "HOMEROOM" || r === "KETUA" || r === "SEKRETARIS";
export const canManageCash = (r: ClassRole) => r === "HOMEROOM" || r === "BENDAHARA";
export const canGivePoints = (r: ClassRole) => r === "HOMEROOM";
```

`src/lib/session.ts`:
```ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAdminClient } from "@/lib/db";
import { canUseApp, type ClassRole } from "@/lib/policies";

export type AppContext = {
  email: string; name: string; classId: string; className: string;
  role: ClassRole; studentId: string | null;
};

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function getContext(): Promise<AppContext | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return null;
  const db = createAdminClient();
  const { data: cls } = await db
    .from("classes").select("id, name").eq("homeroom_email", email).maybeSingle();
  if (cls) return { email, name: session.user.name ?? email, classId: cls.id, className: cls.name, role: "HOMEROOM", studentId: null };
  const { data: st } = await db
    .from("students").select("id, position, class:classes(id, name)").eq("email", email).maybeSingle();
  if (st) return { email, name: session.user.name ?? email, classId: st.class.id, className: st.class.name, role: st.position as ClassRole, studentId: st.id };
  return { email, name: session.user.name ?? email, classId: "", className: "", role: "PENDING", studentId: null };
}

export async function requireApi(check?: (r: ClassRole) => boolean): Promise<AppContext> {
  const ctx = await getContext();
  if (!ctx) throw new ApiError(401, "Belum login");
  if (!canUseApp(ctx.role)) throw new ApiError(403, "Akun belum terdaftar di kelas ini. Hubungi homeroom.");
  if (check && !check(ctx.role)) throw new ApiError(403, "Kamu tidak punya akses untuk aksi ini");
  return ctx;
}
```

`src/app/globals.css`:
```css
@import "tailwindcss";

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 160 84% 28%;
    --primary-foreground: 0 0% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 160 84% 96%;
    --accent-foreground: 160 84% 20%;
    --destructive: 0 84.2% 60.2%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 160 84% 28%;
    --radius: 1rem;
  }
}

@theme inline {
  --color-background: hsl(var(--background));
  --color-foreground: hsl(var(--foreground));
  --color-primary: hsl(var(--primary));
  --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary));
  --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted));
  --color-muted-foreground: hsl(var(--muted-foreground));
  --color-accent: hsl(var(--accent));
  --color-accent-foreground: hsl(var(--accent-foreground));
  --color-destructive: hsl(var(--destructive));
  --color-border: hsl(var(--border));
  --color-input: hsl(var(--input));
  --color-ring: hsl(var(--ring));
  --radius-lg: var(--radius);
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
}

@layer base {
  * { @apply border-border; }
  body { @apply bg-background text-foreground font-sans; }
}

.pb-safe { padding-bottom: env(safe-area-inset-bottom); }
.pt-safe { padding-top: env(safe-area-inset-top); }
```

`src/app/layout.tsx` (Inter via next/font, PWA meta — font lokal tanpa network):
```tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import AuthProvider from "@/components/AuthProvider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "KelasKita 7B — Mutiara Bangsa 2",
  description: "Aplikasi manajemen kelas 7B: kas, pengumuman, agenda, dan poin.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "KelasKita" },
  icons: { apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0b8a5c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
```

**Verifikasi**: `npx tsc --noEmit` → exit 0, tanpa output. Commit `feat(auth): nextauth google + role matching via db trigger`.

**T-8. Halaman login** (`src/app/login/page.tsx`):
```tsx
"use client";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-primary to-emerald-800 p-6 text-white">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 text-3xl font-bold backdrop-blur">7B</div>
        <h1 className="text-lg font-semibold">KelasKita</h1>
        <p className="text-xs text-white/80">Kelas 7B • Mutiara Bangsa 2 JHS</p>
      </div>
      <button
        onClick={() => signIn("google", { callbackUrl: "/" })}
        className="flex items-center gap-3 rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-gray-800 shadow-lg active:scale-95 transition"
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.97 10.97 0 0 0 1 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>
        Masuk dengan Google
      </button>
      <p className="text-[11px] text-white/70">Gunakan akun sekolah @mutiarabangsa.sch.id</p>
    </main>
  );
}
```

`src/app/page.tsx` sementara (diganti di T-15): `export default function Home() { return null; }`

**T-9. Smoke test auth (MULAI SERVER HANYA SETELAH DB ADA)**

```bash
netstat -ano | grep :3000 || echo "port 3000 bebas"   # kalau ada: npm run dev:stop
npm run dev
```

Buka `http://localhost:3000` di browser → redirect ke `/login` → klik Masuk dengan Google → login `tio@mutiarabangsa.sch.id`.
**Expected**: kembali ke `/` (halaman kosong), `getServerSession` valid. Cek DB: `mcp__supabase__execute_sql` → `select email, role from users;` → row tio dengan `role='HOMEROOM'`. Kalau gagal domain: pastikan consent screen published / akun ditambah test user. Commit.

### FASE 2 — Shell & PWA

**T-10. UI primitives SSOT** — `src/components/ui-primitives.tsx` (semua halaman WAJIB pakai ini, jangan bikin komponen UI baru):

```tsx
"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const Button = React.forwardRef<
  HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }
>(({ className, variant, size, asChild, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return <Comp ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
Button.displayName = "Button";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-semibold transition active:scale-95 disabled:pointer-events-none disabled:opacity-50",
  { variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-muted",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-muted",
      },
      size: { default: "h-10 px-4 py-2", sm: "h-8 px-3", lg: "h-12 px-6 text-sm", icon: "h-10 w-10" },
    }, defaultVariants: { variant: "default", size: "default" } }
);

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border bg-card p-3 shadow-sm", className)} {...props} />;
}
export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={cn("inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground", className)} {...props} />;
}
export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="space-y-0.5">
      <h1 className="truncate text-sm font-bold">{title}</h1>
      {subtitle && <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
export function StatCard({ label, value, hint, accent }: { label: string; value: string; hint?: string; accent?: boolean }) {
  return (
    <div className={cn("rounded-2xl p-3", accent ? "bg-gradient-to-br from-primary to-emerald-700 text-white shadow-md" : "border bg-card shadow-sm")}>
      <p className={cn("truncate text-[10px]", accent ? "text-white/80" : "text-muted-foreground")}>{label}</p>
      <p className="truncate text-base font-bold">{value}</p>
      {hint && <p className={cn("truncate text-[10px]", accent ? "text-white/70" : "text-muted-foreground")}>{hint}</p>}
    </div>
  );
}
export function EmptyState({ icon, text }: { icon?: React.ReactNode; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-muted-foreground">
      {icon}<p className="text-xs">{text}</p>
    </div>
  );
}
```

`src/lib/utils.ts`:
```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

**T-11. Icons + manifest** — `scripts/gen_icons.py`:

```python
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(__file__), "..", "public")

def make(path: str, size: int, maskable: bool = False, out_name: str = None):
    img = Image.new("RGB", (size, size), (11, 138, 92))
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", int(size * 0.36))
    except OSError:
        font = ImageFont.load_default()
    text = "7B"
    b = d.textbbox((0, 0), text, font=font)
    w, h = b[2] - b[0], b[3] - b[1]
    d.text(((size - w) / 2 - b[0], (size - h) / 2 - b[1]), text, font=font, fill=(255, 255, 255))
    if maskable:  # aman-kan konten di lingkaran 80%
        pass
    img.save(os.path.join(ROOT, out_name or f"icons/icon-{size}.png"))

os.makedirs(os.path.join(ROOT, "icons"), exist_ok=True)
make(None, 192); make(None, 512); make(None, 512, out_name="icons/maskable-512.png")
make(None, 72, out_name="icons/badge-72.png"); make(None, 180, out_name="apple-touch-icon.png")
print("icons generated ok")
```

```bash
python -m pip install pillow -q && python scripts/gen_icons.py
```

`public/manifest.webmanifest`:
```json
{
  "name": "KelasKita 7B — Mutiara Bangsa 2",
  "short_name": "KelasKita",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#0b8a5c",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

**Expected**: 5 file PNG ada di `public/`. Commit.

**T-12. Service worker + offline** — `src/app/sw.ts`:

```ts
/// <reference types="@serwist/next/typings" />
// @ts-check
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalCacheEntry } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalCacheEntry {}
}
declare self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST as PrecacheEntry[],
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: { entries: [{ url: "/offline", matcher: ({ request }) => request.destination === "document" }] },
});

self.addEventListener("push", (event: PushEvent) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? "KelasKita", {
      body: data.body,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      data: { url: data.url ?? "/" },
    })
  );
});

self.addEventListener("notificationclick", (event: NotificationEvent) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url ?? "/"));
});

serwist.addEventListeners();
```

`src/app/offline/page.tsx`: layar sederhana "Kamu sedang offline — periksa koneksi internet." (pakai EmptyState, gaya gradient seperti login).

**Verifikasi**: `npm run build` → sukses, `public/sw.js` terbentuk. `npm run start` → DevTools → Application → **Manifest**: installable tanpa error; **Service workers**: `sw.js` activated. Commit `feat(pwa): serwist sw + manifest + icons`.

**T-13. DashboardShell + layout (app)** — `src/components/DashboardShell.tsx`:

```tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Megaphone, CalendarDays, Wallet, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/pengumuman", label: "Pengumuman", icon: Megaphone },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/kas", label: "Kas", icon: Wallet },
  { href: "/poin", label: "Poin", icon: Trophy },
];

export default function DashboardShell({
  children, className, name, role, isAdmin,
}: {
  children: React.ReactNode; className?: string;
  name: string; role: string; isAdmin?: boolean;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-dvh pb-20">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur pt-safe">
        <div className="flex items-center justify-between p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">KelasKita</p>
            <p className="truncate text-[10px] text-muted-foreground">{name} • {role}</p>
          </div>
          <nav className="flex items-center gap-2">
            {isAdmin && <Link href="/admin" className="rounded-xl border px-3 py-1.5 text-[10px] font-semibold">Admin</Link>}
            <Link href="/saya" className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {name.slice(0, 1).toUpperCase()}
            </Link>
          </nav>
        </div>
      </header>
      <main className={cn("p-3 space-y-4", className)}>{children}</main>
      <nav className="fixed bottom-0 inset-x-0 z-10 border-t bg-background/95 backdrop-blur pb-safe">
        <div className="grid grid-cols-5">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link key={href} href={href} className={cn("flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
```

`src/app/(app)/layout.tsx` (server component — gate role):
```tsx
import { redirect } from "next/navigation";
import { getContext } from "@/lib/session";
import { canUseApp } from "@/lib/policies";
import DashboardShell from "@/components/DashboardShell";

const ROLE_LABEL: Record<string, string> = {
  HOMEROOM: "Homeroom", KETUA: "Ketua Kelas", BENDAHARA: "Bendahara",
  SEKRETARIS: "Sekretaris", ANGGOTA: "Anggota", PENDING: "Menunggu",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getContext();
  if (!ctx) redirect("/login");
  if (!canUseApp(ctx.role)) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm font-bold">Menunggu aktivasi 👋</p>
        <p className="text-xs text-muted-foreground">Akun <b>{ctx.email}</b> belum terhubung ke kelas. Minta homeroom untuk mendaftarkan email kamu di menu Admin.</p>
      </main>
    );
  }
  return <DashboardShell name={ctx.name} role={ROLE_LABEL[ctx.role]} isAdmin={ctx.role === "HOMEROOM"}>{children}</DashboardShell>;
}
```

Hapus `src/app/page.tsx` lama, pindah ke `src/app/(app)/page.tsx` (T-15). **Verifikasi**: `npx tsc --noEmit` + `npm run build` sukses; buka `/` → bottom nav 5 tab tampil. Commit.

### FASE 3 — Fondasi data (TDD)

**T-14. `src/lib/format.ts` — RED dulu**

Buat `src/lib/__tests__/format.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { formatIDR, monthKeyWIB, monthLabel } from "@/lib/format";

describe("formatIDR", () => {
  it("format rupiah pemisah ribuan id-ID", () => {
    expect(formatIDR(25000)).toBe("Rp 25.000");
    expect(formatIDR(0)).toBe("Rp 0");
    expect(formatIDR(1500)).toBe("Rp 1.500");
  });
});
describe("monthKeyWIB", () => {
  it("pakai WIB (UTC+7), bukan UTC", () => {
    expect(monthKeyWIB(new Date(Date.UTC(2026, 5, 30, 20, 0)))).toBe("2026-07");
    expect(monthKeyWIB(new Date(Date.UTC(2026, 0, 1, 0, 0)))).toBe("2026-01");
  });
});
describe("monthLabel", () => {
  it("label bulan Indonesia", () => {
    expect(monthLabel("2026-09")).toBe("September 2026");
    expect(monthLabel("2027-01")).toBe("Januari 2027");
  });
});
```

```bash
npm test   # EXPECTED: FAIL — format.ts belum ada (error import)
```

Implementasi `src/lib/format.ts`:
```ts
export function formatIDR(n: number): string {
  return "Rp " + n.toLocaleString("id-ID");
}
export function monthKeyWIB(d: Date = new Date()): string {
  return new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 7);
}
export function monthLabel(key: string): string {
  const y = Number(key.slice(0, 4)), m = Number(key.slice(5, 7)) - 1;
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(new Date(Date.UTC(y, m, 1)));
}
export function formatDateID(d: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(d));
}
export function formatTimeID(d: string | Date): string {
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(d)) + " WIB";
}
```

```bash
npm test   # EXPECTED: Test Files 1 passed (1)
git commit -am "feat(lib): format IDR + month WIB (TDD)"
```

**T-15. `src/lib/policies.ts` test + fetcher** — `src/lib/__tests__/policies.test.ts` menegaskan matriks §2.3 penuh (semua kombinasi true/false, minimal assert per fungsi: HOMEROOM/KETUA untuk pengumuman; +SEKRETARIS untuk agenda; +BENDAHARA untuk kas; HOMEROOM saja untuk poin & admin; PENDING gagal canUseApp). Run → pass (policies sudah ada dari T-7; test mengunci matriks).

`src/lib/fetcher.ts`:
```ts
export async function fetcher<T>(url: string): Promise<T> {
  const r = await fetch(url);
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error(body?.error ?? `Gagal memuat (${r.status})`);
  return body as T;
}
```

**T-16. Error helper** — tambahkan di `src/lib/session.ts`:
```ts
export function apiError(e: unknown) {
  if (e instanceof ApiError) return Response.json({ error: e.message }, { status: e.status });
  console.error(e);
  return Response.json({ error: "Terjadi kesalahan server" }, { status: 500 });
}
```
Pola setiap route handler: `try { ... } catch (e) { return apiError(e); }`. Commit.

### FASE 4 — Fitur (satu vertical slice per fitur)

> Pola konstan semua fitur: **(1)** route handler `src/app/api/...` (otorisasi via `requireApi(policy)`, query selalu `.eq("class_id", ctx.classId)`), **(2)** UI pakai `useSWR` + `fetcher` + `ui-primitives`, aksi tulis tombolnya hanya dirender jika boleh (policy di server tetap dijaga). Toast sederhana: state string 3 detik.

**T-17. Pengumuman (slice contoh — tiru pola ini untuk fitur lain)**

`src/app/api/announcements/route.ts`:
```ts
import { NextResponse } from "next/server";
import { requireApi, apiError } from "@/lib/session";
import { canPostAnnouncement } from "@/lib/policies";
import { createAdminClient } from "@/lib/db";
import { broadcastPush } from "@/lib/push";

export async function GET() {
  try {
    const ctx = await requireApi();
    const { data } = await createAdminClient()
      .from("announcements").select("*").eq("class_id", ctx.classId)
      .order("pinned", { ascending: false }).order("created_at", { ascending: false }).limit(50);
    return NextResponse.json(data ?? []);
  } catch (e) { return apiError(e); }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireApi(canPostAnnouncement);
    const { title, body, pinned } = await req.json();
    if (!String(title ?? "").trim() || !String(body ?? "").trim())
      return NextResponse.json({ error: "Judul dan isi wajib diisi" }, { status: 400 });
    const db = createAdminClient();
    const { data, error } = await db.from("announcements")
      .insert({ class_id: ctx.classId, title: String(title).trim(), body: String(body).trim(),
                pinned: !!pinned, created_by: ctx.email })
      .select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await broadcastPush(`📢 ${data.title}`, String(body).trim().slice(0, 90));
    return NextResponse.json(data, { status: 201 });
  } catch (e) { return apiError(e); }
}
```

`src/app/api/announcements/[id]/route.ts`: `PATCH` (body `{pinned?}` toggle — policy canPostAnnouncement; edit title/body) dan `DELETE` (policy canPostAnnouncement; cek `.eq("id", id).eq("class_id", ctx.classId)` sebelum delete).

`src/app/(app)/pengumuman/page.tsx` (client): SWR `/api/announcements`; daftar Card (📌 Badge "Disematkan" bila pinned; judul truncate; tanggal `formatDateID`; excerpt 2 baris); tombol "+ Pengumuman" (floating) hanya jika `canPostAnnouncement` — role diambil dari `useSession()` (`session.user.role` hanya HOMEROOM/STUDENT/PENDING → untuk granular, ambil role efektif: tambahkan role efektif ke session via endpoint `/api/me` kecil yang return `getContext()`; simpan di SWR `/api/me`). Form dialog (Radix Dialog): input judul, textarea isi, switch "Sematkan". Detail `pengumuman/[id]/page.tsx`: server component — body `whitespace-pre-wrap`, tombol Sematkan/Lepas & Hapus (policy).

**Verifikasi**: `npm run dev`; login tio → buat pengumuman → muncul di list teratas; login akun dev faeyza → tidak ada tombol tambah; `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/announcements` (tanpa cookie) → `401`. Commit `feat(announcements): crud + push broadcast`.

**T-18. Agenda** — `src/app/api/events/route.ts`: GET (upcoming: `.gte("starts_at", new Date().toISOString()).order("starts_at")` limit 50) + POST (policy `canManageAgenda`; body `{title, starts_at, ends_at?, location?, description?}`; validasi `title` & `starts_at` wajib). `events/[id]/route.ts`: DELETE (policy sama). UI `agenda/page.tsx`: group by tanggal ("Hari ini", "Besok", lalu `formatDateID`), Card per event (judul truncate, waktu `formatTimeID`, lokasi), form tambah (datetime-local, native select/input). Verifikasi serupa T-17. Commit.

**T-19. Kas — ringkasan + transaksi**

`src/app/api/kas/summary/route.ts` (GET, semua role):
```ts
const ctx = await requireApi();
const db = createAdminClient();
const { data: sum } = await db.from("class_cash_summary").select("balance").eq("class_id", ctx.classId).single();
const mk = monthKeyWIB();
const { data: month } = await db.from("dues_months").select("id, title, amount, month_key")
  .eq("class_id", ctx.classId).eq("month_key", mk).maybeSingle();
let myPaid = null; let paidCount = 0, totalCount = 0;
if (month) {
  const { count } = await db.from("month_payment_status").select("payment_id", { count: "exact", head: true })
    .eq("month_id", month.id).not("payment_id", "is", null);
  paidCount = count ?? 0;
  const { count: total } = await db.from("students").select("id", { count: "exact", head: true })
    .eq("class_id", ctx.classId).eq("active", true);
  totalCount = total ?? 0;
  if (ctx.studentId) {
    const { data: mine } = await db.from("month_payment_status")
      .select("paid_amount").eq("month_id", month.id).eq("student_id", ctx.studentId).maybeSingle();
    myPaid = mine?.paid_amount ?? 0;
  }
}
const { data: recent } = await db.from("transactions").select("*").eq("class_id", ctx.classId)
  .order("created_at", { ascending: false }).limit(5);
return NextResponse.json({ balance: sum?.balance ?? 0, month, paidCount, totalCount, myPaid, recent });
```

`src/app/api/kas/transactions/route.ts`: POST (policy `canManageCash`; body `{kind:"IN"|"OUT", category, amount:int>0, description, occurred_on?}` default hari ini) + GET (list 50). `transactions/[id]/route.ts`: DELETE (policy, cek class_id).

UI `kas/page.tsx`: StatCard aksen besar "Saldo Kas" (formatIDR) + 2 kartu kecil ("Iuran bulan ini: X/Y bayar" dan "Status saya: Lunas/Belum"); section "Transaksi Terakhir" (icon panah masuk hijau/keluar merah, kategori truncate, nominal); bila `canManageCash`: tab "Kelola" — form tambah transaksi (select Jenis Pemasukan/Pengeluaran, kategori, nominal angka, keterangan) + daftar penuh + tombol hapus. **Verifikasi**: tambah transaksi IN 50.000 → saldo bertambah 50.000 (refresh); `execute_sql`: `select * from class_cash_summary;` cocok. Commit.

**T-20. Kas — iuran bulanan (grid pembayaran)**

`src/app/api/kas/months/route.ts`: GET (list bulan, desc) + POST (policy `canManageCash`; body `{month_key:"YYYY-MM", amount, title}`; unique(class_id, month_key) → error friendly "Bulan itu sudah ada"). `months/[id]/route.ts`: GET → dari view `month_payment_status` `.eq("month_id", id)` (list siswa + status) + info bulan; DELETE (policy).

`src/app/api/kas/payments/route.ts`: POST (policy `canManageCash`; body `{monthId, studentId, amount?}` default amount bulan; insert; konflik duplikat → error "Sudah dibayar"); `payments/[id]/route.ts`: DELETE (un-mark bayar).

UI `kas/iuran/[monthId]/page.tsx` (client, SWR): header (bulan, nominal, progress "12/30 bayar"); grid/list siswa: satu baris per siswa — nama truncate + Badge "Lunas" hijau / tombol "Tandai" (bendahara/homeroom) dengan **optimistic update**:
```ts
mutate(async (d) => d, { revalidate: false }); // pola: salin state, tandai lokal
// lalu:
const r = await fetch("/api/kas/payments", { method: "POST", body: JSON.stringify({ monthId, studentId }) });
if (!r.ok) { toast("Gagal menandai"); mutate(); }   // rollback via revalidate
else { navigator.vibrate?.(20); mutate(); }
```
Tap siswa yang sudah lunas (bendahara) → konfirmasi hapus (un-mark). **Verifikasi**: tandai 3 siswa dev → progress 3/3; saldo di kas bertambah +30.000 di `execute_sql`. Commit `feat(kas): dues grid + optimistic payment`.

**T-21. Poin**

`src/app/api/points/route.ts`: GET → leaderboard `student_points_total` `.eq("class_id", ctx.classId).order("total_points", desc)` + (bila student) histori poin sendiri `points.select("*").eq("student_id", ctx.studentId).order("created_at", desc)`; POST (policy `canGivePoints`; body `{studentId, kind:"PRESTASI"|"PELANGGARAN", delta:int abs 1..100, reason}`; simpan delta bertanda: PRESTASI → +delta, PELANGGARAN → -delta; validasi reason wajib).

UI `poin/page.tsx`: Top-3 podium (medali 🥇🥈🥉) + list ranking (rank, nama truncate, total, badge Prestasi/Pelanggaran net) + histori poin saya (untuk siswa). Tombol "Beri Poin" (hanya HOMEROOM): Dialog — select siswa (native `<select>`), segmented Prestasi/Pelanggaran, chips nominal (+5 +10 +20 / -5 -10 -20), input alasan. **Verifikasi**: beri +10 prestasi ke Faeyza → leaderboard naik; -5 pelanggaran ke Andra → total turun; akun faeyza login → histori menampilkan entri. Commit.

**T-22. Halaman Saya** — `saya/page.tsx` (client): Card profil (nama, email, role, kelas); tombol "Keluar" (`signOut({ callbackUrl: "/login" })`); tombol **"Aktifkan Notifikasi"** (lihat T-24); petunjuk install PWA (teks dinamis iOS/Android); tombol "Kirim Tes Notifikasi" (POST `/api/push/test`) untuk verifikasi push. Commit.

**T-23. Admin (homeroom only)**

`src/app/api/admin/students/route.ts`: GET (list siswa + posisi) + POST bulk (body `{names: string[]}` → insert satu per baris `full_name`, position ANGGOTA). `students/[id]/route.ts`: PATCH (body `{position?, email?, nis?, active?}` — set email otomatis membuat akun tsb jadi STUDENT via trigger) + DELETE. `admin/users/[id]/link/route.ts`: PUT body `{studentId}` → set `students.email = users.email` (cara menautkan akun PENDING baru login).

`src/app/admin/page.tsx` (server layout sendiri — tanpa bottom nav; redirect bila bukan HOMEROOM): tiga section — **Roster** (tabel siswa: nama, select posisi native, input email, toggle aktif, hapus; tombol "Tambah Massal" → dialog textarea satu nama per baris), **Akun Menunggu** (list `users where role=PENDING` + select siswa → "Tautkan"), **Info Kelas** (nama kelas, email homeroom — read-only). **Verifikasi**: tambah massal 3 nama → muncul; tautkan akun pending → akun itu refresh → langsung masuk app sebagai ANGGOTA (tanpa re-login ulang OAuth). Commit `feat(admin): roster + role + account linking`.

**T-24. Beranda** — `src/app/(app)/page.tsx` (server component; query langsung):
- Salam + nama (`Selamat pagi/siang/sore/malam` by jam WIB server—pakai client greeting kecil jika perlu, default "Halo").
- Kartu aksen: pengumuman terpinned terbaru (atau terbaru) — tap ke detail.
- Agenda 3 terdekat (title, `formatDateID` + `formatTimeID`).
- Mini stat: saldo kas (`formatIDR`), status iuran saya bulan ini (Lunas/Belum — badge), poin saya.
Query: pinned announcement `.eq("class_id").order("pinned", desc).order("created_at", desc).limit(1)`; events `.gte("starts_at", now).limit(3)`; `class_cash_summary`; status iuran & poin pakai pola T-19/T-21. Commit.

### FASE 5 — Push Notification

**T-25. VAPID lib + subscribe**

`src/lib/push.ts`:
```ts
import webpush from "web-push";
import { createAdminClient } from "@/lib/db";

let ready = false;
function init() {
  if (!ready) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!,
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      process.env.VAPID_PRIVATE_KEY!
    );
    ready = true;
  }
}

export async function sendToAll(title: string, body: string, url = "/") {
  init();
  const db = createAdminClient();
  const { data: subs } = await db.from("push_subscriptions")
    .select("endpoint, p256dh, auth_key, user_email")
    .in("user_email", (await db.from("users").select("email").neq("role", "PENDING").then(r => r.data?.map(u => u.email) ?? []));
  if (!subs?.length) return { sent: 0 };
  const results = await Promise.allSettled(
    (subs as any[]).map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
        JSON.stringify({ title, body, url })
      )
    )
  );
  const dead: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      const st = (r.reason as any)?.statusCode;
      if (st === 404 || st === 410) dead.push(subs[i].endpoint);
    }
  });
  if (dead.length) await db.from("push_subscriptions").delete().in("endpoint", dead);
  return { sent: results.filter((r) => r.status === "fulfilled").length };
}

export const broadcastPush = sendToAll;
```

`src/app/api/push/subscribe/route.ts`: POST body = `PushSubscriptionJSON` (endpoint, keys.p256dh, keys.auth) → upsert ke `push_subscriptions` (onConflict endpoint, user_email = ctx.email); DELETE body `{endpoint}` → hapus. Policy: `requireApi()` (semua user aktif).

`src/app/api/push/test/route.ts`: POST (policy `canGivePoints` — homeroom saja) → `sendToAll("🔔 Tes Notifikasi", "Notifikasi KelasKita berfungsi!", "/")`.

Tombol "Aktifkan Notifikasi" di `saya/page.tsx`:
```ts
const reg = await navigator.serviceWorker.ready;
const sub = await reg.pushManager.subscribe({
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
});
await fetch("/api/push/subscribe", { method: "POST", body: JSON.stringify(sub.toJSON()) });
```
(`urlBase64ToUint8Array` helper kecil di lib/fetcher atau inline). **Verifikasi**: build+start (SW hanya jalan di production build) → enable notif di Chrome desktop → klik "Kirim Tes" → notifikasi muncul. Commit.

**T-26. Cron reminder iuran** — `vercel.json`:
```json
{ "crons": [{ "path": "/api/cron/dues-reminder", "schedule": "0 0 * * *" }] }
```

`src/app/api/cron/dues-reminder/route.ts` (Node runtime):
```ts
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return new Response("unauthorized", { status: 401 });
  const { createAdminClient } = await import("@/lib/db");
  const { sendToAll } = await import("@/lib/push");
  const { monthKeyWIB, monthLabel } = await import("@/lib/format");
  const db = createAdminClient();
  const { data: month } = await db.from("dues_months")
    .select("id, title, amount").eq("month_key", monthKeyWIB()).maybeSingle();
  if (!month) return Response.json({ skipped: "no dues month" });
  const { data: unpaid } = await db.from("month_payment_status")
    .select("student_id, full_name")
    .eq("month_id", month.id).is("payment_id", null);
  const emails = unpaid?.length
    ? (await db.from("students").select("email").in("id", unpaid.map(u => u.student_id)).neq("email", "")).data?.map(s => s.email).filter(Boolean)
    : [];
  if (!emails?.length) return Response.json({ skipped: "all paid" });
  const { data: subs } = await db.from("push_subscriptions").select("endpoint, p256dh, auth_key").in("user_email", emails as string[]);
  // kirim langsung per endpoint (sendToAll menarget semua; di sini perlu subset)
  const webpush = (await import("web-push")).default;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth_key } },
        JSON.stringify({ title: "⏰ Reminder Iuran", body: `Iuran bulan ini belum dibayar. Cek status di menu Kas.`, url: "/kas" }));
      sent++;
    } catch (e: any) { if ([404, 410].includes(e?.statusCode)) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint); }
  }
  return Response.json({ sent });
}
```

**Verifikasi lokal**: `npm run build && npm run start`, lalu
`curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/dues-reminder` → `{"sent":<angka>}` (akun dev belum bayar & sudah subscribe). Commit `feat(push): vapid + broadcast + cron reminder`.

### FASE 6 — Deploy & Rollout

**T-27. Deploy Vercel**

```bash
cd D:/Workspace/kelaskita && vercel link    # "Set up new project" → name: kelaskita-7b
# set env (nilai dari .env.local; NEXTAUTH_URL & NEXT_PUBLIC_APP_URL = https://<domain-final>)
for v in NEXTAUTH_SECRET NEXTAUTH_URL NEXT_PUBLIC_APP_URL GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET \
  NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY \
  NEXT_PUBLIC_VAPID_PUBLIC_KEY VAPID_PRIVATE_KEY VAPID_SUBJECT CRON_SECRET; do
  echo "set $v saat prompt (copy dari .env.local)"; done
vercel env add NEXTAUTH_SECRET production   # ... ulang per variabel (atau vercel env add ... < file)
vercel --prod
```
Catat URL final (mis. `https://kelaskita-7b.vercel.app`). **WAJIB**: update redirect URI Google OAuth (T-6) ke domain final + `NEXTAUTH_URL`/`NEXT_PUBLIC_APP_URL`. **Verifikasi prod**: buka URL → login tio sukses; DevTools → Application → Manifest installable; `vercel logs` cron jalan (cek besok 07:00 WIB, atau trigger manual: `curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/dues-reminder`).

**T-28. Audit PWA final** — Chrome (desktop + DevTools mobile emulation): Lighthouse → kategori PWA; target: **Installable ✅** (manifest + SW + HTTPS). Items manual: iOS — buka di Safari → Share → Add to Home Screen → buka dari Home Screen → fullscreen standalone tanpa bar browser. Android Chrome — install prompt muncul. Perbaiki yang merah, commit.

**T-29. Rollout ke kelas (checklist operasional, bukan kode)**
1. Admin → Roster → tambah massal nama seluruh siswa 7B (satu nama per baris).
2. Isi email siswa (bertahap) — siswa login pertama kali yang belum terdaftar → layar tunggu → homeroom tautkan di Admin.
3. Tetapkan posisi pengurus (ketua/bendahara/sekretaris).
4. Buat iuran bulan berjalan (Kas → Kelola → bulan + nominal).
5. Sesi singkat di kelas: semua install PWA + aktifkan notifikasi (iOS ≥16.4 wajib Add to Home Screen dulu).
6. Posting pengumuman pertama sebagai tes broadcast.

### Opsional (butuh interaksi user, tanyakan dulu)

- GitHub remote: `gh` belum login — jalankan `gh auth login` (user) lalu `gh repo create kelaskita --private --source=. --push`.
- Custom domain (mis. `kelas.mutiarabangsa.sch.id`): butuh akses DNS sekolah + update redirect URI + env URL.

## 6. Verifikasi akhir (semua harus hijau sebelum dinyatakan selesai)

```bash
npm run typecheck     # 0 error
npm run test          # semua test pass (policies + format)
npm run build         # sukses, sw.js terbentuk
```
- [ ] Login tio (HOMEROOM) → semua fitur; login faeyza (ANGGOTA) → hanya lihat; login bendahara.dev → kelola kas; akun tak dikenal → layar tunggu.
- [ ] Matikan internet setelah buka app (mode pesawat) → app shell tetap terbuka + halaman offline untuk navigasi baru; aksi tulis → toast error (tidak crash).
- [ ] Push tes diterima (desktop Chrome + 1 HP Android + 1 iPhone ter-install).
- [ ] Cron dues-reminder membalas `{"sent":N}`.
- [ ] Prod URL: install PWA di HP, login, tandai 1 pembayaran iuran, saldo berubah.

## 7. Risiko, Tradeoff, Pertanyaan Terbuka

**Risiko & mitigasi**
- **Limit project Supabase free (2 aktif)**: kalau create gagal → pause project Trip (`gsmdtqoczaihpvxpepbq`) via MCP, atau fallback: pakai project Trip yang sama dengan semua table di schema baru `create schema kelaskita; set search_path` — kurangi 2 hari masa trial-nya. Keputusan: **pause Trip** (R1, tanyakan user dulu).
- **iOS push** hanya jalan setelah Add to Home Screen & iOS ≥16.4 → rollout T-29 langkah 5 wajib; Android aman.
- **OAuth consent "Testing"** memblokir akun luar daftar test user → publish app (T-6).
- **Port 3000 bentrok** dengan dev server lain → selalu `npm run dev:stop` dulu.
- **EALLOWSCRIPTS npm** → hanya install manual dengan `.npmrc` (T-1); jangan pernah `create-next-app`/`shadcn init`.
- **Serwist SW tidak jalan di `npm run dev`** (disabled by design) → semua verifikasi PWA harus `build`+`start`.

**Tradeoff yang disengaja**
- Tanpa RLS Supabase (anon key tidak dipakai browser; semua via route handler + service_role) → authz terpusat di satu tempat (`requireApi`), lebih sederhana; konsekuensi: kepercayaan penuh ke Next.js layer (acceptable untuk app kelas).
- Reminder iuran maksimal 1×/hari (Vercel Hobby cron) — cukup.
- Angka uang integer rupiah, tanpa desimal.
- Leaderboard poin menampilkan semua (bukan hanya top) — transparansi kelas; kalau terbukti memotivasi negatif, ubah jadi top-10 di fase 2.

**Pertanyaan terbuka** (tidak memblokir implementasi — default sudah dipilih)
1. Nama app "KelasKita" + monogram "7B" sebagai icon — ganti desain logo nanti kalau ada (cukup replace PNG di `public/icons/`).
2. Email homeroom dipakai `tio@mutiarabangsa.sch.id` (dari memori) — konfirmasi/ubah di `002_seed.sql` sebelum apply.
3. Perlu GitHub private repo? (perlu `gh auth login` user) — default: lokal git saja.
4. Nominal iuran default Rp 10.000 (ubah bebas di UI, per bulan).

**Selesai — total ~29 task, estimasi 3-5 hari kerja terfokus.**
