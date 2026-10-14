# Spec: Full English Localization Across All Pages and Elements

## Problem Statement
When a user sets the language preference to English in the Settings menu (or accesses the app with English as the default), several UI elements, date/time formatters, accessibility labels (aria-labels), role titles, and standard brief headings still display in Indonesian. Users expect a seamless, fully English interface across all application pages, navigation, drawers, dialogs, and external entry points like the login page.

## Solution
Implement full English localization across all pages and elements when English is selected:
1. Make date/time formatting bilingual (`formatDateID`, `formatTimeID`, `timeAgo`, `whenLabel`, `timeLabel`) dynamically respecting the active `lang` ("id" vs "en").
2. Localize role labels in `src/lib/roles.ts` (`formatRoleLabel` with `lang` support) to the exact mapped titles:
   - HOMEROOM: Wali Kelas -> Homeroom
   - TEACHER: Guru -> Teacher
   - KETUA: Ketua -> Class Leader
   - BENDAHARA: Bendahara -> Finance Lead
   - SEKRETARIS: Sekretaris -> Secretary
   - ANGGOTA: Anggota -> Member
   - PENDING: Menunggu -> Pending
3. Map standardized system brief titles in Beranda and Pengumuman (`"Info Harian"` -> `"Daily Brief"` via i18n lookup), while keeping dynamic user-authored announcement body content in its original form.
4. Audit and replace hardcoded Indonesian text across all pages and components with `useT()` / `STRINGS` entries:
   - Beranda (`/app`): empty state `"Belum ada poin"` -> `t("poin.empty")`, date displays.
   - Layout & Shell (`AppShell.tsx`, `layout.tsx`): aria-labels (`"Notifikasi"`, `"Menu profil"`, `"Pengaturan cepat"`), profile role chip.
   - Pengumuman (`/app/pengumuman`): `timeLabel` ("Baru saja", "jam lalu", "hari lalu").
   - Agenda (`/app/agenda`): list date/time strings.
   - Kas & Buku Kas (`/app/kas`, `/app/kas/buku`): transaction date groups, detail modal dates.
   - Poin / Leaderboard / Scan (`/app/poin`, `/app/scan`): `whenLabel`, scan page instructions.
   - Mass Report (`/app/report/new`, `MassReportPanel.tsx`): vote badges, confirmation strings.
   - Admin Pages (`/app/admin/roster`, `/app/admin/whitelist`, `/app/admin/settings`): table headers, button labels.
   - Login Page (`/login`): error messages, "Masuk dengan Google" button, headings.

## User Stories
1. As an English-speaking user, I want the bottom navigation, headers, and quick settings to display in English, so that I can easily navigate the app.
2. As a student viewing the Beranda, I want the agenda dates to show in English format (e.g., "Thu, 22 Oct"), so that I can understand upcoming event dates without translating Indonesian day names.
3. As a user viewing the pinned announcement card on Beranda, I want the standardized title "Info Harian" to display as "Daily Brief" in English mode, so that system-generated titles feel native.
4. As a student viewing the podium and leaderboard, I want empty states (like "No points yet") to be in English when English is active, so that no hardcoded Indonesian appears.
5. As a user opening the profile drawer or viewing role badges, I want roles to display as "Homeroom", "Teacher", "Class Leader", "Finance Lead", "Secretary", and "Member", so that roles match the school's English terminology.
6. As a student using screen readers or assistive tools, I want aria-labels (such as notification bell, profile button, and quick toggle) to be in English, so that accessibility tools speak English when the app is in English mode.
7. As a student viewing announcement cards in /app/pengumuman, I want relative timestamps (e.g., "Just now", "2 hours ago", "3 days ago") to display in English, so that posting times are clear.
8. As a student or treasurer looking at cash transactions in /app/kas and Buku Kas, I want date headers and transaction timestamps to follow the active language, so that dates are intuitive.
9. As a teacher using /app/scan, I want scanner instructions and role indicators to appear in English, so that the scanning flow is clear.
10. As a user arriving at /login, I want the login card and OAuth error notices to be in English, so that the authentication screen matches the default app language.

## Implementation Decisions
- **Localization SSOT**: Extend `src/lib/locales.ts` dictionary with all missing keys for aria-labels, relative times, roles, and login strings.
- **Date Formatters**:
  - Update `src/lib/format.ts`: `formatDateID` will accept an optional `lang: "id" | "en"` parameter, defaulting to `"id"` for test compatibility, but rendering English day/month abbreviations when `lang === "en"`. Add `formatDateCompact` with `lang` support.
  - Make `timeAgo` / `timeLabel` consume i18n translations for "just now", "X hours ago", and "X days ago".
- **Role Formatter**:
  - Update `src/lib/roles.ts`: `formatRoleLabel(role, lang?: "id" | "en")` supporting dual dictionaries with specific English terms requested:
    - HOMEROOM: "Homeroom"
    - TEACHER: "Teacher"
    - KETUA: "Class Leader"
    - BENDAHARA: "Finance Lead"
    - SEKRETARIS: "Secretary"
    - ANGGOTA: "Member"
    - PENDING: "Pending"
- **Standardized Brief Title Translation**:
  - In `src/app/app/page.tsx` and wherever brief titles are displayed, map base title `"Info Harian"` to `t("info.dailyBrief")` ("Daily Brief").
- **Accessibility & Shell**:
  - In `src/components/AppShell.tsx`, use `t()` for notification bell aria-label, profile menu aria-label, and quick settings aria-labels.
- **Login Page**:
  - Wire `src/app/login/page.tsx` with `useT()` or client-side locale strings for header, subtitle, Google button, and OAuth error messages.

## Testing Decisions
- Test external behavior of `formatDateID(d, "en")` vs `formatDateID(d, "id")` in `src/lib/format.test.ts`.
- Test `formatRoleLabel(role, "en")` vs `formatRoleLabel(role, "id")` in `src/lib/roles.test.ts`.
- Run full Vitest suite (`npx vitest run`) to ensure 0 regressions.
- Run typecheck (`npm run typecheck`) to ensure type safety across all consumers.

## Out of Scope
- Automatic AI machine translation of free-form, user-generated body text saved in the database (e.g. actual text paragraphs written by students or teachers).
- Converting currency from IDR (Rp) to other currencies (currency remains Indonesian Rupiah formatted as "Rp. X").

## Further Notes
- All changes must adhere strictly to `AGENTS.md` and pass both Pilar 1 (CodeGraph) and Pilar 2 (Matt Pocock Spec & Ticket pipeline).
