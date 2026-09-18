# Role-Based UI Logic — Seven Bro!

> **Prinsip:** Bottom-nav siswa seragam untuk menu aktif. Yang beda adalah **UI & aksi di dalam halaman**, menyesuaikan role. Tidak ada panel terpisah.
>
> **Homeroom = Super Admin** — semua policy manage + admin.

---

## 1. Role aktif

| Role | Siapa | Contoh |
|------|--------|--------|
| **HOMEROOM** | Wali kelas / super admin | Tio |
| **BENDAHARA** | Bendahara kelas | Pauline, Madeline |
| **KETUA** | Ketua kelas | Edmund |
| **SEKRETARIS** | Sekretaris | Freissy, Andra |
| **ANGGOTA** | Siswa biasa | Erica, Keiko, dll. |
| **TEACHER** | Guru mapel | teacher@… |

Label UI: `formatRoleLabel()` → Wali Kelas · Ketua · Bendahara · Sekretaris · Anggota · Guru.

---

## 2. Matriks aksi (SSOT: `src/lib/policies.ts`)

| Aksi | HOMEROOM | BENDAHARA | KETUA | SEKRETARIS | ANGGOTA | TEACHER |
|------|:--------:|:---------:|:-----:|:----------:|:-------:|:-------:|
| Beranda | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Info / Agenda (halaman) | ✅ | ❌ disabled | ❌ disabled | ❌ disabled | ❌ disabled | — |
| Manage Info | ✅ | ❌ | ⏳* | ❌ | ❌ | — |
| Manage Agenda | ✅ | ❌ | ⏳* | ⏳* | ❌ | — |
| Kas read-only | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Kas manage | ✅ | ✅ | ❌ | ❌ | ❌ | — |
| Buku Kas | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| Beri poin manual | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Lihat Roster | ✅ | ❌ | ✅ | ❌ | ❌ | — |
| Mutasi roster langsung | ✅ | ❌ | ❌ | ❌ | ❌ | — |
| Usul roster (approval) | ❌ | ❌ | ✅ | ❌ | ❌ | — |
| Buat Mass Report | ❌ | ❌ | ✅ | ❌ | ❌ | — |
| Vote Mass Report | ✅ | ✅ | ✅** | ✅ | ✅ | ❌ |
| Review Mass Report | ✅ | ❌ | ❌ | ❌ | ❌ | — |
| Admin roster/setelan penuh | ✅ | ❌ | ❌ | ❌ | ❌ | — |

\* Saat Info/Agenda dibuka kembali untuk murid: KETUA + SEKRETARIS manage.  
\** Pelapor (biasanya Ketua) **tidak** boleh vote laporannya sendiri.

### Bottom nav

| Role | Menu |
|------|------|
| HOMEROOM | Beranda · Info · Agenda · Kas · Poin |
| KETUA / BENDAHARA / SEKRETARIS / ANGGOTA | Beranda · Info(disabled) · Agenda(disabled) · Kas · Poin |
| TEACHER | Beri Poin (`/app/scan`) |

Item disabled: tampil abu, tidak bisa ditap. Info/Agenda `PAGE_ROLES = ["HOMEROOM"]` sampai dibuka lagi.

---

## 3. Halaman kunci

### Beranda
- Sapaan **Halo nama depan**
- Kartu Saldo Kas (semua siswa yang boleh Kas)
- Kartu Info/Agenda: **hanya Homeroom** (menu murid disabled)

### Kas
- **Manage:** HOMEROOM + BENDAHARA
- **Read-only:** lainnya — subtitle + iuran saya; tanpa Bayar Khusus / Pengeluaran / Setoran

### Arena Poin
- Tabs: **Leaderboard** · **Battle Log** · **Report**
- Podium muted (abu, tanpa nama) jika skor top masih seri
- Homeroom/Teacher: **Beri Poin** (preset alasan)
- Tab Report: daftar Mass Report + vote/review

### Roster (`/app/admin/roster`)
- HOMEROOM: mutasi + review usulan Ketua
- KETUA: usul ADD/UPDATE/DELETE → `roster_proposals`

### Mass Report
| Aktor | Tempat | Aksi |
|-------|--------|------|
| Ketua | Avatar → **Buat Report** | Form `/app/report/new` (preset / custom + foto bukti) |
| Siswa | Arena Poin · tab Report + **modal global** | Vote Setuju / Tidak Setuju |
| Homeroom | Modal → **Buka Panel Review** · Poin Report | Terima (−poin + preset custom) / Tolak; lihat daftar pemilih |

- Vote threshold: **≥ 10 vote** total → status READY (bukan 50% kelas)
- Custom Report: draft Ketua; Homeroom boleh edit deskripsi sebelum Apply → masuk `report_presets`
- Foto bukti: dikompres di perangkat → disimpan di DB (`photo_data`)

### Notifikasi
- Tap → mark read + **navigasi** (report→Poin/Report, roster, info, agenda, kas)
- Shade: **Hapus Semua** + hapus per item
- Homeroom: notif aksi pengurus; pelapor dapat kabar vote/review

---

## 4. Aturan implementasi

1. Policy SSOT: `policies.ts`; API tetap `requireApi`
2. Sembunyikan kontrol yang bukan milik role
3. Homeroom = union manage
4. Label role via `formatRoleLabel` / nama via `formatDisplayName`
5. Nav disabled untuk fitur yang belum dibuka — jangan matikan policy server

---

## 5. Referensi kode

- `src/lib/policies.ts` — canAdmin, canManageKas, canViewKas, canCreateMassReport, canReviewMassReport, canViewRoster, …
- `src/lib/roles.ts` — formatRoleLabel
- `src/components/RoleGate.tsx`
- `src/app/app/layout.tsx` — getNavItems / getAdminItems
- `src/components/MassReportPanel.tsx`, `MassReportVoteModal.tsx`
- `src/lib/notif-nav.ts` — path notif
