# 05: Clickable Cash Balance Card to Cashbook

**What to build:**
Jadikan kartu Saldo Kas (Cash Balance card) di `src/app/app/kas/page.tsx` menjadi interaktif dan tapable/clickable. Saat ditekan (tap/click), navigasi langsung ke halaman Buku Kas (`/app/kas/buku`). Berikan affordance visual berupa `ChevronRight` subtle di samping judul serta micro-interaction `active:scale-[0.98] transition-all cursor-pointer hover:opacity-95`.

**Blocked by:** 04: Integration Quality Gate & Verification

**Status:** done

- [x] Wrap / konversi card `bg-deep` menjadi `<Link href="/app/kas/buku">` di `src/app/app/kas/page.tsx`
- [x] Tambahkan ikon affordance navigasi `ChevronRight` di baris judul Cash Balance
- [x] Berikan style `active:scale-[0.98] transition-all cursor-pointer group-hover:translate-x-0.5`
- [x] Verifikasi typecheck & vitest tetap hijau
