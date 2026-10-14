# Spec: Auto Unpin Previous Daily Brief

## 1. Problem Statement
Saat pengguna membuat atau memin Daily Brief baru, pin pada Daily Brief sebelumnya tetap aktif sehingga terjadi double pin (atau lebih dari satu brief disematkan bersamaan). Pengguna meminta agar setiap kali ada Daily Brief yang dipin baru, pin pada brief lama otomatis dinonaktifkan (unpin) sehingga selalu hanya ada maksimal 1 Daily Brief yang ter-pin.

## 2. Solution Design
1. **Di `src/app/api/info-briefs/route.ts` (POST / Edit Brief)**:
   - Jika `pinned === true`:
     - Update semua entri `daily_briefs` di kelas tersebut selain brief saat ini menjadi `pinned = false`.
     - Update semua `announcements` yang terkait dengan `daily_briefs` lain di kelas tersebut menjadi `pinned = false`.
2. **Di `src/app/api/announcements/[id]/route.ts` (PATCH announcement / Toggle Pin)**:
   - Sinkronisasi ke tabel `daily_briefs`:
     - Cek apakah `announcement_id` ada di `daily_briefs`.
     - Jika `patch.pinned === true` dan announcement tersebut merupakan daily brief:
       - Set `pinned = false` untuk semua daily brief lain di kelas ini.
       - Set `pinned = false` untuk semua announcement yang terkait daily brief lain di kelas ini.
       - Set `pinned = true` untuk entri `daily_briefs` yang terkait dengan announcement ini.
     - Jika `patch.pinned === false` dan announcement tersebut merupakan daily brief:
       - Set `pinned = false` untuk entri `daily_briefs` yang terkait.
3. **Di `src/app/app/pengumuman/page.tsx`**:
   - `mutate()` dipanggil setelah toggle pin atau simpan brief, memastikan UI langsung menyegarkan state pin seluruh kartu.

## 3. Acceptance Criteria
1. Saat membuat Daily Brief baru dengan opsi pin aktif, semua brief sebelumnya otomatis ter-unpin.
2. Saat menekan ikon Pin pada suatu Daily Brief, brief lain yang sebelumnya ter-pin otomatis dilepas pin-nya.
3. Tidak ada lagi double pin antar Daily Brief.
4. Typecheck dan Vitest tetap 100% lulus.
