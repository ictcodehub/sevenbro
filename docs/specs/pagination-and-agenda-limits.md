# Spec: Pagination and Agenda Limits

## 1. Background & Goals
User meminta:
1. **Menu Info / Pengumuman**: Jika sudah 15 baris, pastikan navigasi halaman (pagination) berfungsi rapi sehingga user bisa berpindah halaman berikutnya.
2. **Menu Report**: Riwayat laporan (Report history di MassReportPanel) dibatasi menjadi 10 baris per halaman (`DONE_PAGE_SIZE = 10`), serta navigasi yang jelas.
3. **Menu Agenda**:
   - Agenda yang sudah lewat (past event) tidak boleh dihapus dari database, melainkan wajib ditampilkan dalam keadaan disabled (visual muted / opacity 50%, indikator berakhir, edit/aksi dibatasi/disabled).
   - Batasi agenda menjadi 10 baris per halaman (`PAGE_LIMIT = 10`) dengan navigasi halaman yang jelas.

---

## 2. Technical Details

### A. Info / Pengumuman (`src/app/app/pengumuman/page.tsx`)
- Pastikan `PAGE_LIMIT = 15`.
- Periksa navigasi: jika `pageCount > 1`, tampilkan kontrol Previous / Next dan indikator halaman aktif yang kontras dan mudah diakses.

### B. Report History (`src/components/MassReportPanel.tsx`)
- Ubah `const DONE_PAGE_SIZE = 15` menjadi `const DONE_PAGE_SIZE = 10`.
- Navigasi tetap menampilkan paginasi 10 baris per halaman.

### C. Agenda (`src/app/app/agenda/page.tsx` & `src/app/api/events/route.ts`)
- **Backend (`src/app/api/events/route.ts`)**:
  - Hapus kode otomatis `delete` pada `pastIds`.
  - Kembalikan seluruh events (baik yang akan datang maupun yang sudah lampau), diurutkan berdasarkan `starts_at` (yang akan datang / terbaru di atas, atau kronologis yang jelas).
- **Komponen `TimelineItem` (`src/components/ui-primitives.tsx`)**:
  - Tambahkan prop `disabled?: boolean`.
  - Jika `disabled`, tampilkan node dan teks dengan warna abu-abu / muted, opacity 60%, dan badge kecil "Ended" / "Lewat".
- **Halaman Agenda (`src/app/app/agenda/page.tsx`)**:
  - Ubah `PAGE_LIMIT` dari 15 ke 10.
  - Jangan filter buang event yang lewat (`+new Date(e.starts_at) >= now`); tampilkan event dengan tanda `isPast = isEventPast(ev.starts_at, ev.ends_at)`.
  - Urutkan: event mendatang (waktu terdekat dahulu), kemudian event lampau di bawahnya.
  - Saat `isPast` true, pasang `disabled` ke `TimelineItem`, dan disable/sembunyikan tombol edit agar tidak bisa diedit jika sudah lewat.

---

## 3. Acceptance Criteria
1. Menu Pengumuman membatasi 15 item per halaman dengan navigasi Prev / Next.
2. Menu Report (riwayat laporan) membatasi 10 item per halaman dengan navigasi Prev / Next.
3. Menu Agenda menampilkan maksimal 10 event per halaman dengan navigasi Prev / Next.
4. Agenda yang sudah lewat tidak dihapus otomatis dari database; tampil dalam kondisi disabled di halaman Agenda.
5. `npm run typecheck` dan `npx vitest run` hijau (0 errors).
