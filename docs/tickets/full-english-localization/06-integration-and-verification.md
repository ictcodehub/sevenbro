# 06: Integration, CodeGraph Sync & Quality Gate Verification

**What to build:**
Perform end-to-end audit and validation across the entire application:
- Verify that setting language to English results in 100% English UI chrome, labels, formatters, and roles.
- Run `npm run typecheck` to confirm 0 TypeScript errors.
- Run `npx vitest run` to ensure all tests pass (including updated format and role tests).
- Run `codegraph status` to sync the CodeGraph index.
- Prepare double code review (Standards Review & Spec Review) per Pilar 2.

**Blocked by:** 01-format-dates-and-times, 02-roles-and-badges, 03-shell-and-beranda-cleanups, 04-pages-audit-pengumuman-agenda-kas-poin, 05-login-page-localization

**Status:** done

- [x] Execute `npm run typecheck` (must pass 100%)
- [x] Execute `npx vitest run` (all test suites green)
- [x] Execute `codegraph status`
- [x] Complete double code review against Spec and repo standards
