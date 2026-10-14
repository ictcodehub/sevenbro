# 02: Role Labels & Badges Localization

**What to build:**
Localize user role and title labels to match the school's exact English terminology. Update `src/lib/roles.ts` (`formatRoleLabel`) to accept an optional `lang: "id" | "en"` parameter. When `lang === "en"`, map roles to:
- HOMEROOM -> "Homeroom"
- TEACHER -> "Teacher"
- KETUA -> "Class Leader"
- BENDAHARA -> "Finance Lead"
- SEKRETARIS -> "Secretary"
- ANGGOTA -> "Member"
- PENDING -> "Pending"
Default / ID remains Indonesian ("Wali Kelas", "Guru", "Ketua", "Bendahara", "Sekretaris", "Anggota", "Menunggu"). Update unit tests in `src/lib/roles.test.ts`.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Add `ROLE_LABELS_EN` map in `src/lib/roles.ts` with requested terms
- [x] Support `lang?: "id" | "en"` in `formatRoleLabel`
- [x] Add tests in `src/lib/roles.test.ts` for English role formatting
- [x] Ensure backward compatibility for calls without `lang`
