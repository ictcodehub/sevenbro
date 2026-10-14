# 03: AppShell & Beranda Cleanups & Accessibility

**What to build:**
Refactor `AppShell.tsx` and `src/app/app/page.tsx` so that all shell elements, Beranda agenda dates, brief titles, empty states, and accessibility `aria-label` attributes display in English when English is active:
1. `AppShell.tsx`:
   - Notification button aria-label: `"Notifications, X unread"` (EN) vs `"Notifikasi, X belum dibaca"` (ID).
   - Profile button aria-label: `"Profile menu"` vs `"Menu profil"`.
   - Quick settings aria-label: `"Quick settings"` vs `"Pengaturan cepat"`.
   - Pass active `lang` to `formatRoleLabel` in user profile badge/drawer.
2. `src/app/app/page.tsx`:
   - Map standard brief title `"Info Harian"` to `t("info.dailyBrief")` ("Daily Brief").
   - Agenda date item formatted via `formatDateID(date, lang)`.
   - Empty leaderboard text `"Belum ada poin"` replaced with `t("poin.empty")` ("No points yet").

**Blocked by:** 01-format-dates-and-times, 02-roles-and-badges

**Status:** done

- [x] Add `notif.ariaWithCount`, `appShell.profileMenu`, `appShell.quickSettings` to `src/lib/locales.ts`
- [x] Update `AppShell.tsx` aria-labels using `t()`
- [x] Pass `lang` to `formatRoleLabel` in `AppShell.tsx`
- [x] Map brief title `"Info Harian"` in `page.tsx` using `t("info.dailyBrief")`
- [x] Localize Beranda agenda date using `formatDateID(new Date(e.starts_at), lang)`
- [x] Replace `"Belum ada poin"` with `t("poin.empty")`
