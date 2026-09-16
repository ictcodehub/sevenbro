# Seven Bro!

Kelas 7B class-management PWA — **Kas**, **Pengumuman & Agenda**, **Poin Perilaku** —
untuk homeroom & siswa Kelas 7B Mutiara Bangsa 2 JHS. Mobile-first, native-feel, offline-capable.

## Stack

- **Next.js 15** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS 4** (tokens as CSS variables in `src/app/globals.css` — `@theme inline`)
- **shadcn/Radix UI** primitives (`src/components/ui/*`)
- **next-pwa** runtime caching (`next.config.mjs`) — app-shell precache + offline fallback
- `lucide-react` icons
- Planned: `next-auth` (Google) · `@supabase/supabase-js` · `web-push` · `vitest`

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000 → redirects to /app
```

Scripts: `dev` · `build` · `start` · `lint` · `typecheck`

## Plan & docs

- Build plan (roles matrix, DB schema, T-1..T-29): `.hermes/plans/2026-09-15_083831-kelas-7b-class-management-pwa.md`
- Design system: `docs/DESIGN_SYSTEM.md` · UX patterns: `docs/UX_PATTERNS.md`

## Status (rebranded from nl-starter)

- [x] Scaffold + rebrand: manifest, metadata, shell brand, icons (7B monogram)
- [ ] Auth (next-auth Google, school-domain restrict) — plan T-4..T-7
- [ ] Supabase schema + seed — plan T-4
- [ ] Feature screens: Kas / Pengumuman+Agenda / Poin / Admin — plan FASE 4
- [ ] Push notifications + dues reminder cron — plan T-24..T-26

