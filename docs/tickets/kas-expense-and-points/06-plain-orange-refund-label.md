# 06: Plain Orange Text for Refund Label

**What to build:**
1. Hilangkan elemen styling pill/badge pada label kategori "Expense Refund" di baris tabel Buku Kas (`src/app/app/kas/buku/page.tsx`). Jadikan teks biasa (`text-[10px]`) sejajar dengan yang lain, namun dengan warna teks oranye (`text-amber-600 dark:text-amber-400 font-medium`).
2. Ubah label dari "Expense Refund" / "Sisa Pengeluaran" menjadi ringkas: `"Refund"` di `src/lib/locales.ts` (`kas.catRefund`).

**Blocked by:** 05: Clickable Cash Balance Card to Cashbook

**Status:** done

- [x] Ubah `kas.catRefund` di `src/lib/locales.ts` menjadi `"Refund"` (ID & EN)
- [x] Ganti render badge pill menjadi teks biasa dengan warna oranye `text-amber-600 dark:text-amber-400 font-medium` di `src/app/app/kas/buku/page.tsx`
- [x] Verifikasi typecheck & vitest hijau
