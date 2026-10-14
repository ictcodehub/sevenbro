# 05: Login Page Localization

**What to build:**
Localize `/login` (`src/app/login/page.tsx`) so that the header, subtitle, Google sign-in button, loading state, and OAuth error messages display in English when English is the active default language:
- Title: "Seven Bro!"
- Subtitle: "Sign in with your school account" (EN) / "Login dengan akun sekolah Anda" (ID)
- Button: "Sign in with Google" (EN) / "Masuk dengan Google" (ID)
- Loading: "Redirecting..." (EN) / "Mengarahkan..." (ID)
- OAuth errors: English equivalents for OAuthCallback, OAuthAccountNotLinked, AccessDenied, Configuration, default.

**Blocked by:** None (can start immediately)

**Status:** done

- [x] Add login strings and OAuth error strings to `src/lib/locales.ts`
- [x] Connect `src/app/login/page.tsx` to `useI18n()`
- [x] Render localized login card and error messages
- [x] Verify SSR compatibility for the login route
