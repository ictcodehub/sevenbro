# 01: Bilingual Date & Time Formatters

**What to build:**
Enable bilingual date and time formatting across the application. Update `format.ts` so that `formatDateID` accepts an optional `lang: "id" | "en"` parameter, outputting English day/month abbreviations (e.g. "Thu, 22 Oct") when `lang === "en"`, while preserving default Indonesian formatting ("Kam, 22 Okt") when `lang === "id"` or omitted. Add English day & month lookup maps. Update `format.test.ts` to verify both English and Indonesian outputs.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Add ENGLISH_DAYS and ENGLISH_MONTH_LABELS in `src/lib/format.ts`
- [x] Add `lang?: "id" | "en"` to `formatDateID` and `formatDateCompactID`
- [x] Update `src/lib/format.test.ts` with test cases for English date output
- [x] Ensure all existing tests in `format.test.ts` remain green
