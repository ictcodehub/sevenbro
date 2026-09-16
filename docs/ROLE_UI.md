# Role-Based UI Logic — Seven Bro!

> **Prinsip:** Menu bottom-nav tetap sama untuk pengurus. Yang beda adalah **UI & aksi di dalam tiap halaman**, menyesuaikan role. Tidak ada panel terpisah.
>
> **Homeroom = Super Admin** — dapat semua UI + semua aksi dari semua role pengurus + admin.

---

## 1. Role aktif

| Role | Siapa | Contoh |
|------|--------|--------|
| **HOMEROOM** | Wali kelas / super admin | Tio |
| **BENDAHARA** | Bendahara kelas | Pauline, Madeline |
| **KETUA** | Ketua kelas | Edmund |
| **SEKRETARIS** | Sekretaris | Freissy, Andra |
| **ANGGOTA** | Siswa biasa | Erica, Jivin, dll. |
| **TEACHER** | Guru mapel (bukan homeroom) | teacher@… |

---

## 2. Matriks aksi per role

Sumber kebenaran tetap `src/lib/policies.ts`. UI hanya **render** tombol/form sesuai policy; server tetap jaga via `requireApi`.

| Aksi | HOMEROOM | BENDAHARA | KETUA | SEKRETARIS | ANGGOTA | TEACHER |
|------|:--------:|:---------:|:-----:|:----------:|:-------:|:-------:|
| Lihat beranda / info / agenda | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Post / pin / hapus Info | ✅ | ❌ | ✅ | ❌ | ❌ | — |
| Tambah / hapus Agenda | ✅ | ❌ | ✅ | ✅ | ❌ | — |
| Kas: lihat saldo & riwayat | ✅ | ✅ | ✅* | ✅* | ✅* | — |
| Kas: setoran / bayar khusus / pengeluaran / izin | ✅ | ✅ | ❌ | ❌ | ❌ | — |
| Kas: Buku Kas (ledger) | ✅ | ✅ | ❌ | ❌ | ❌ | — |
| Beri poin | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Roster / tautkan akun / setelan kelas | ✅ | ❌ | ❌ | ❌ | ❌ | — |

\* Lihat Kas: saat ini nav Kas hanya untuk Homeroom & Bendahara. Opsional ke depan: pengurus lain boleh **read-only** Kas (tanpa tombol manage).

---

## 3. Perilaku per halaman

### 3.1 Beranda
- Semua role aktif (kecuali TEACHER) → sapaan + ringkasan
- HOMEROOM & BENDAHARA → saldo kas prominent
- Semua → pengumuman, agenda, top poin

### 3.2 Info (Pengumuman)
- **Semua role aktif:** daftar pengumuman (read-only)
- **HOMEROOM & KETUA:** tombol **+ Baru**, icon pin/unpin, hapus di card

### 3.3 Agenda
- **Semua role aktif:** daftar agenda
- **HOMEROOM, KETUA, SEKRETARIS:** tombol **+ Agenda**, hapus item

### 3.4 Kas
- **Nav Kas:** hanya HOMEROOM & BENDAHARA (opsional: read-only untuk pengurus lain — belum diaktifkan)
- **HOMEROOM & BENDAHARA (manage):**
  - Setoran hari ini (checklist Bayar / Izin)
  - Bayar Khusus, Pengeluaran
  - Buku Kas (ledger, per siswa, matriks)
  - Tunggak kumulatif
- **ANGGOTA / pengurus non-bendahara (jika diizinkan masuk):**
  - Hanya saldo + status iuran pribadi + riwayat (tanpa tombol manage)

### 3.5 Poin
- **Semua role aktif:** arena / leaderboard + detail
- **HOMEROOM & TEACHER:** tombol **Beri Poin** / Kasih Poin

### 3.6 Admin (Roster & Pengaturan Kelas)
- **HOMEROOM only** (menu Shield di header)
- TEACHER: tidak dapat menu admin; akses `/app/scan` saja

### 3.7 Scan (Kasih Poin)
- **HOMEROOM & TEACHER** — deep link QR
- ANGGOTA & pengurus lain: RoleGate blok

---

## 4. Aturan implementasi

1. **Satu sumber policy:** `policies.ts` + `requireApi` di API. UI tidak mengandalkan role string manual kalau sudah ada `can*()`.
2. **Sembunyikan, jangan disabled-only** — kalau role tidak boleh aksi, tombol/form tidak dirender (kecuali layout yang memang butuh affordance).
3. **Homeroom = union semua policy pengurus** — `canManageKas || canPostAnnouncement || …` sudah true; cukup pastikan semua `can*` termasuk HOMEROOM.
4. **Bottom nav konsisten** — pengurus (HOMEROOM/KETUA/BENDAHARA/SEKRETARIS) lihat menu yang sama untuk role mereka; TEACHER dan ANGGOTA beda path.
5. **Server always guard** — UI menyembunyikan ≠ aman; API tetap `requireApi(policyFn)`.

---

## 5. Gap saat ini (checklist eksekusi)

| Item | Status |
|------|--------|
| policies.ts lengkap | ✅ |
| Kas manage: HOMEROOM + BENDAHARA | ✅ |
| Kas nav: hanya HOMEROOM + BENDAHARA | ✅ |
| Info manage: HOMEROOM + KETUA | ✅ (tombol conditional) |
| Agenda manage: HOMEROOM + KETUA + SEKRETARIS | ✅ |
| Poin give: HOMEROOM + TEACHER | ✅ |
| Admin: HOMEROOM only | ✅ |
| RoleGate per halaman | ✅ |
| Homeroom = super admin (semua can*) | ✅ (policy) |
| Kas read-only untuk KETUA/SEKRETARIS (opsional) | ❌ belum — nav sembunyi Kas |
| Badge / label role di header (opsional) | ❌ belum |
| Dokumen ini referensi di README / TAKEOVER | ➡️ setelah merge |

---

## 6. Referensi kode

- `src/lib/policies.ts` — canPostAnnouncement, canManageAgenda, canManageKas, canGivePoints, canAdmin, canUseApp
- `src/lib/session.ts` — requireApi(policy?)
- `src/components/RoleGate.tsx` — guard client-side
- `src/app/app/layout.tsx` — getNavItems(role)
- Contoh: `kas/page.tsx` (canManageKas), `pengumuman/page.tsx` (canPostAnnouncement), `scan/page.tsx` (canGivePoints)
