# Role-Based UI Logic — Seven Bro!

> **Prinsip:** Menu bottom-nav tetap sama untuk siswa & pengurus. Yang beda adalah **UI & aksi di dalam tiap halaman**, menyesuaikan role. Tidak ada panel terpisah / extra menu.
>
> **Homeroom = Super Admin** — dapat semua UI + semua aksi dari semua role pengurus + admin. Policy Homeroom sudah union semua `can*` manage.

---

## 1. Role aktif

| Role | Siapa | Contoh |
|------|--------|--------|
| **HOMEROOM** | Wali kelas / super admin | Tio |
| **BENDAHARA** | Bendahara kelas | Pauline, Madeline |
| **KETUA** | Ketua kelas | Edmund |
| **SEKRETARIS** | Sekretaris | Freissy, Andra |
| **ANGGOTA** | Siswa biasa | Erica, Jivin, Keiko, dll. |
| **TEACHER** | Guru mapel (bukan homeroom) | teacher@… |

Label UI (Title Case Indonesia): Wali Kelas · Ketua · Bendahara · Sekretaris · Anggota · Guru.

---

## 2. Matriks aksi per role

Sumber kebenaran tetap `src/lib/policies.ts`. UI hanya **render** tombol/form sesuai policy; server tetap jaga via `requireApi`.

| Aksi | HOMEROOM | BENDAHARA | KETUA | SEKRETARIS | ANGGOTA | TEACHER |
|------|:--------:|:---------:|:-----:|:----------:|:-------:|:-------:|
| Lihat beranda / info / agenda | ✅ | ❌* | ❌* | ❌* | ❌* | — |
| Post / pin / hapus Info | ✅ | ❌ | ❌ | ❌ | ❌ | — |
| Tambah / hapus Agenda | ✅ | ❌ | ❌ | ❌ | ❌ | — |
| Kas: lihat saldo & riwayat (read-only) | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Kas: setoran / bayar khusus / pengeluaran / izin | ✅ | ✅ | ❌ | ❌ | ❌ | — |
| Kas: Buku Kas (ledger / per siswa / matriks) | ✅ | ✅ | ✅* | ✅* | ✅* | — |
| Beri poin | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Lihat Roster | ✅ | ❌ | ✅ | ❌ | ❌ | — |
| Mutasi Roster langsung | ✅ | ❌ | ❌ | ❌ | ❌ | — |
| Usul mutasi Roster (approval Homeroom) | — | ❌ | ✅ | ❌ | ❌ | — |
| Tautkan akun / setelan kelas | ✅ | ❌ | ❌ | ❌ | ❌ | — |

\* Read-only: filter & lihat data boleh; mutasi kas tetap `canManageKas`.
\* Info & Agenda **sementara** hanya Homeroom; menu murid **disabled** sampai dibuka lagi.

---

## 3. Perilaku per halaman

### 3.1 Beranda
- Semua role aktif (kecuali TEACHER) → sapaan **Halo &lt;nama depan&gt;** + ringkasan
- Saldo Kas card untuk semua siswa (transparansi) → link ke `/app/kas`
- Semua → pengumuman, agenda, top poin

### 3.2 Info (Pengumuman)
- **HOMEROOM only** (sementara — menu murid disabled sampai dibuka lagi)
- **HOMEROOM & KETUA (saat dibuka):** tombol **+ Baru**, icon pin/unpin, hapus / edit di card

### 3.3 Agenda
- **HOMEROOM only** (sementara — menu murid disabled sampai dibuka lagi)
- **HOMEROOM, KETUA, SEKRETARIS (saat dibuka):** tombol **+ Agenda**, edit, hapus item

### 3.4 Kas
- **Nav Kas:** HOMEROOM, KETUA, BENDAHARA, SEKRETARIS, **ANGGOTA**
- **Manage (`canManageKas` = HOMEROOM & BENDAHARA):**
  - Bayar Khusus, Pengeluaran
  - Setoran hari ini (checklist Bayar / Izin)
  - Ringkasan tunggak
  - Buku Kas penuh (ledger, per siswa, matriks)
- **Read-only (KETUA, SEKRETARIS, ANGGOTA):**
  - Subtitle: “Hanya dapat dilihat — pengelolaan oleh Bendahara & Wali Kelas”
  - Saldo + arus bulan ini + transaksi terakhir
  - Status iuran pribadi (`myPaid`) bila ada
  - Buku Kas: lihat ledger / filter — tanpa aksi mutasi

### 3.5 Poin
- **Semua role aktif:** arena / leaderboard + detail (nav **Poin** juga untuk ANGGOTA)
- **HOMEROOM & TEACHER:** tombol **Beri Poin**

### 3.6 Admin (Roster & Pengaturan Kelas)
- **Roster:** HOMEROOM + KETUA
- **HOMEROOM:** mutasi langsung (tambah/edit/hapus/posisi/aktif), guru, tautkan akun, **approve/reject usulan Ketua**
- **KETUA:** lihat daftar siswa, **usul** tambah/edit/hapus/posisi — status PENDING sampai Homeroom setujui
- **Pengaturan Kelas:** HOMEROOM only
- TEACHER: tidak dapat menu admin; akses `/app/scan` saja

### 3.7 Scan (Beri Poin)
- **HOMEROOM & TEACHER** — deep link QR
- Siswa & pengurus lain: RoleGate blok

---

## 4. Aturan implementasi

1. **Satu sumber policy:** `policies.ts` + `requireApi` di API. UI tidak hardcode role string kalau sudah ada `can*()`.
2. **Sembunyikan, jangan disabled-only** — kalau role tidak boleh aksi, tombol/form tidak dirender (kecuali layout yang memang butuh affordance read-only).
3. **Homeroom = union semua policy pengurus** — semua `can*` manage termasuk HOMEROOM.
4. **Bottom nav siswa seragam** — Beranda · Info · Agenda · Kas · Poin untuk HOMEROOM/KETUA/BENDAHARA/SEKRETARIS/ANGGOTA. TEACHER hanya `/app/scan`.
5. **Server always guard** — UI menyembunyikan ≠ aman; API tetap `requireApi(policyFn)`.
6. **Label role** — `formatRoleLabel()` di `roles.ts`; jangan tampilkan kode mentah `HOMEROOM` di UI.

---

## 5. Gap checklist (target eksekusi)

| Item | Status |
|------|--------|
| policies.ts lengkap | ✅ |
| `canViewKas` (read-only Kas) | ✅ |
| Kas manage: HOMEROOM + BENDAHARA | ✅ |
| Kas nav + PAGE_ROLES: semua siswa aktif | ✅ |
| Kas read-only UI (subtitle, tanpa tombol manage) | ✅ |
| Status iuran pribadi (`myPaid`) untuk viewer | ✅ |
| Buku Kas read-only untuk semua viewer Kas | ✅ |
| students GET: izinkan `canManageKas` / `canViewKas` | ✅ |
| students GET: sembunyikan email/NIS untuk non-admin | ✅ |
| Info manage: HOMEROOM + KETUA | ✅ |
| Agenda manage: HOMEROOM + KETUA + SEKRETARIS | ✅ |
| Poin give: HOMEROOM + TEACHER | ✅ |
| Poin nav untuk ANGGOTA | ✅ |
| Admin: HOMEROOM only | ✅ |
| RoleGate per halaman | ✅ |
| Homeroom = super admin (semua can*) | ✅ |
| Label role Title Case Indonesia | ✅ |

---

## 6. Referensi kode

- `src/lib/policies.ts` — canPostAnnouncement, canManageAgenda, canManageKas, canViewKas, canGivePoints, canAdmin, canUseApp
- `src/lib/roles.ts` — resolveEffectiveRole, formatRoleLabel
- `src/lib/session.ts` — requireApi(policy?)
- `src/components/RoleGate.tsx` — guard client-side
- `src/app/app/layout.tsx` — getNavItems(role)
- Contoh: `kas/page.tsx` (canManageKas vs canViewKas), `pengumuman/page.tsx` (canPostAnnouncement), `scan/page.tsx` (canGivePoints)
