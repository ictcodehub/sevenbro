## Status (Takeover MiMo — 2026-09-16)

| Kondisi | Phase aktif |
|---|---|
| **Online** | FASE 4 done (API + pages + admin) |

- Selesai: scaffold, TDD libs (103 tests), auth stack, **API routes + SWR pages + admin + signOut**
- Verifikasi terakhir: `npx tsc --noEmit` ✅ · `npm run build` ✅ · `npx vitest run` ✅ **103 tests / 5 files**
- OAuth: POST+CSRF → redirect ke Google OK. Pastikan Google Console punya
  `http://localhost:3000/api/auth/callback/google` dan consent screen Published / test user `tio@mutiarabangsa.sch.id`
- Login **wajib** via `http://localhost:3000` (bukan IP LAN) supaya cookie NextAuth cocok dengan `NEXTAUTH_URL`

### Checklist

```
[x] T-9    — OAuth hardening (jwt try/catch, effective role, error UI di /login)
[x] T-14   — /app/pengumuman — full content + SWR /api/announcements
[x] T-15   — /app/agenda — full content + SWR /api/events
[x] T-16   — /app/kas — full content + SWR /api/kas/summary
[x] T-17   — /app/poin — full content + SWR /api/points
[x] T-18   — /app/settings — full content + signOut
[x] T-19   — /app/admin/roster — HOMEROOM only + bulk add
[x] T-20   — /app/admin/settings — toggles fitur kelas
[x] T-21   — Real API integration (announcements/events/kas/points/admin/me)
[x] T-23   — SignOut wiring di ShellLayout + Settings
[ ] T-22   — PWA push notifications (VAPID, sw.js handler) — belum
[ ] Persistensi toggle admin settings ke DB — belum (state UI saja)
```
