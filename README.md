# NL Starter

Mobile-first Next.js app template extracted from the **NL Discovery** design system —
compact density, mixed emerald/lime palette, dark hero cards, bottom-tab app shell, and PWA offline caching out of the box.

## Stack

- **Next.js 15** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS 4** (tokens as CSS variables in `src/app/globals.css` — `@theme inline`)
- **shadcn/Radix UI** primitives (`src/components/ui/*`)
- **next-pwa** runtime caching (`next.config.mjs`)
- `lucide-react` icons

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000 → redirects to /app
```

Scripts: `dev` · `build` · `start` · `lint` · `typecheck`

## What's inside

```
src/
  app/
    layout.tsx            # fonts, PWA manifest, viewport
    page.tsx               # redirects to /app
    app/                   # the app shell + demo tab pages
      layout.tsx           # AppShell wiring — nav, notifications, user (edit me)
      page.tsx             # home: StatCard, HeroCard, ProgressCard, ListRow
      browse/page.tsx      # Tabs, Badge, Button, ListRow, EmptyState
      activity/page.tsx    # list layout
      saved/page.tsx       # SwipeRow (swipe-left edit/delete)
      settings/page.tsx    # toggle rows, outline Button
  components/
    AppShell.tsx           # generic shell — brand, nav, notifications, profile via props
    ui-primitives.tsx      # SectionHeader, StatCard, ListRow, EmptyState,
                           # HeroCard, ProgressCard, Timeline(Item)
    admin/SwipeRow.tsx     # swipe-to-action list row
    ui/                    # avatar, badge, button, card, tabs (shadcn)
  lib/
    utils.ts               # cn()
    demo-data.ts           # placeholder data — replace with your data layer
docs/
  DESIGN_SYSTEM.md         # tokens & rules (SSOT)
  UX_PATTERNS.md           # list/admin interaction patterns
```

## Design system quickstart

All colors/typography are CSS variables in `src/app/globals.css` (`--color-page`,
`--color-surface`, `--color-deep`, `--color-forest`, `--color-lime`, `--color-ink`,
`--color-line`, …) exposed to Tailwind via `@theme inline`. Use them, never raw hex:

```tsx
<div className="bg-white border border-line shadow-sm rounded-xl p-2.5">…</div>
```

Core rules (full detail in `docs/DESIGN_SYSTEM.md`):
- Mobile-first, compact density (`text-[9–11px]`), everything `truncate` on one line
- Light cards: `bg-white border border-line shadow-sm`; dark cards: `bg-deep rounded-2xl`
- Dark-card text: labels `text-white/55–70`, times/locations `text-acid`
- Tap feedback `active:scale-[0.98]`, flat `shadow-sm`, no gradients on dashboard
- Bottom nav: up to 5 items, active = `bg-forest/15 text-forest`

## The AppShell

`src/components/AppShell.tsx` renders the frame; everything app-specific is a prop:

```tsx
<AppShell
  brand={{ logoSrc: "/brand-logo.png", logoAlt: "My App", title: "My App", subtitle: "Tagline" }}
  nav={{ left: […], home: {…}, right: […] }}        // ≤2 + 1 + ≤2 items, LucideIcon each
  notifications={notifs}                            // AppShellNotification[] — [] hides the bell
  unreadIds={unread}                                // read-state is your concern
  onNotificationClick={markRead} onMarkAllRead={…} onClearNotifications={…}
  user={{ name, email, image }}                     // omit to hide avatar/profile
  profileActions={[{ label: "Admin", href: "/admin" }]}
  onSignOut={signOut}
>
  {children}
</AppShell>
```

## Adding auth / a backend

The template ships without auth or a database on purpose. Suggested path:
1. `npm i next-auth` — add `src/app/api/auth/[...nextauth]/route.ts`, wrap children in
   `SessionProvider`, and feed `user`/`onSignOut` from `useSession()`
2. Add middleware to protect `/app/:path*`
3. Swap `src/lib/demo-data.ts` for your data layer; point the `runtimeCaching`
   API rule in `next.config.mjs` at your backend

## Rebranding checklist

- [ ] Replace `public/brand-logo.png`, `icon-*.png`, `apple-touch-icon.png`
- [ ] Edit `public/manifest.json` (name, theme_color, start_url)
- [ ] Edit `src/app/layout.tsx` metadata + viewport themeColor
- [ ] Edit `src/app/app/layout.tsx` (brand, nav items, notifications, user)
- [ ] Delete demo pages, `demo-data.ts`, and this checklist
