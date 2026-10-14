# 04: Subpages Audit & Hardcoded Text Elimination

**What to build:**
Audit and eliminate hardcoded Indonesian strings across subpages:
1. `src/app/app/pengumuman/page.tsx`:
   - Replace hardcoded `timeLabel` ("Baru saja", "jam lalu", "hari lalu") with `timeAgo` / i18n keys (`common.justNow`, `common.hoursAgo`, `common.daysAgo`).
2. `src/app/app/agenda/page.tsx`:
   - Pass `lang` to `formatDateID` in timeline and agenda list.
3. `src/app/app/kas/page.tsx` & `src/app/app/kas/buku/page.tsx`:
   - Pass `lang` to `formatDateID` in transaction history and detail modal.
   - Localize day headers in transaction journal (`"Mon, 14 Sep"` vs `"Senin, 14 Sep"`).
4. `src/app/app/poin/page.tsx` & `src/app/app/scan/page.tsx`:
   - Pass `lang` to `formatDateID` in `whenLabel`.
   - Pass `lang` to `formatRoleLabel`.
5. `src/app/app/settings/page.tsx`:
   - Pass `lang` to `formatRoleLabel` in user card.

**Blocked by:** 01-format-dates-and-times, 02-roles-and-badges

**Status:** done

- [x] Add missing relative time keys in `locales.ts`
- [x] Refactor `timeLabel` in `pengumuman/page.tsx` to use i18n
- [x] Pass `lang` to date formatting in `agenda/page.tsx`
- [x] Pass `lang` to date formatting in `kas/page.tsx` and `kas/buku/page.tsx`
- [x] Pass `lang` to `whenLabel` in `poin/page.tsx`
- [x] Pass `lang` to `formatRoleLabel` in `settings/page.tsx` and `scan/page.tsx`
