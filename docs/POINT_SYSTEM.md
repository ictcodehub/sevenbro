# Point System — Seven Bro!

> SSOT faktor **tambah** / **kurang** poin.  
> Alasan di form Beri Poin dan preset Mass Report **harus** mengikuti daftar ini.

---

## 1. Tambah poin (+)

| ID | Faktor | Poin | Siapa | Cara |
|----|--------|------|-------|------|
| A1 | Bayar uang kas | +1 | Sistem (Bendahara catat setoran) | **Otomatis** saat setoran tercatat |
| A2 | Perfect Score DT (ulangan harian) | +5 | Homeroom / Teacher | Manual · form Prestasi |
| A3 | Perfect Score PT (ulangan tengah semester) | +5 | Homeroom / Teacher | Manual · form Prestasi |
| A4 | Mengerjakan piket | +1 | Ketua / Sekretaris | Checklist piket |
| A5 | Juara lomba / representasi kelas | +5 (atau +10) | Homeroom | Manual · form Prestasi |

DT/PT di form: pilih mapel di alasan (mis. “Perfect Score DT Matematika”).

---

## 2. Kurang poin (−) — utama saja

| ID | Faktor | Poin | Siapa | Cara |
|----|--------|------|-------|------|
| B1 | Tidak bayar kas (tanpa izin) | −1 | Sistem | **Otomatis** −1 per minggu tanpa transaksi kas |
| B2 | (kelipatan B1) ~1 bulan tanpa bayar | −4 (≈ B1 × 4 minggu) | Sistem | Ikut B1 |
| B3 | Tidak mengerjakan piket | −1 | Ketua / Sekretaris | Checklist absen piket |
| B4 | Izin kas **3× beruntun** (izin tidak dipotong otomatis; setelah 3× izin berturut-turut baru −1) | −1 | Homeroom (approve) atau sistem | Perlu keputusan: otomatis vs Homeroom |
| B5 | Mass Report **diterima Homeroom** (preset pelanggaran) | sesuai preset | Ketua → vote → Homeroom approve | −1 / −2 / −3 |

### Preset Mass Report (sama dengan preset form Beri Poin)

| Label | Delta |
|-------|------:|
| Tidak Mengerjakan Piket | −1 |
| Tidak Patuh Aturan Kelas | −2 |
| Ganggu Proses Belajar | −3 |
| Kasar / Tidak Sopan | −3 |

Izin kas: **tidak dihapus** dari sistem — hanya **tidak bayar + tidak izin** yang −1 mingguan. Izin beruntun **3×** = −1 (penyesuaian).

### Alur Mass Report
1. **Ketua** → avatar → **Buat Report** (merah, di bawah Roster) → form full-screen `/app/report/new`
2. Alasan: dropdown preset (+ preset custom yang sudah disetujui) atau **Custom Report**
3. Custom: vote jalan langsung dengan draft ketua; Homeroom bisa **edit deskripsi** lalu Apply → jadi preset baru
4. Target: checklist lingkaran; opsional **foto bukti** (dikompres di perangkat, simpan di DB)
5. **Anggota** → Arena Poin → **Vote Setuju**
6. Vote ≥ 50% kelas → READY → Homeroom **Terima / Tolak**

---

## 3. Prioritas implementasi

| # | Item | Status |
|---|------|--------|
| 1 | Preset alasan di form Beri Poin | ✅ |
| 2 | Auto +1 saat setoran kas (A1) | ✅ (max 1×/siswa/hari) |
| 3 | Checklist piket A4 / B3 | ⬜ |
| 4 | Mass Report + vote + Homeroom approve | ✅ (UI di Arena Poin) |
| 5 | Auto −1 kas mingguan (B1) + izin 3× (B4) | ⬜ |

---

## 4. Catatan teknis

- Sumber poin: tabel `points` (`kind` PRESTASI/PELANGGARAN, `delta`, `reason`, `created_by`)
- Auto: `created_by` = `system@…` supaya Battle Log jelas
- Idempotensi: cek sebelum insert (mis. +1 kas hanya **1× per siswa per hari setoran**)
- Notif: sistem → Homeroom; B1 → notif ke siswa yang belum bayar
- SSOT policy role tetap: hanya HOMEROOM / TEACHER yang **manual** Beri Poin; Bendahara setoran memicu A1 lewat server

---

## 5. Tidak dipakai (diusulkan dihapus)

- Study circle / tugas tambahan  
- Kepanitian non-piket  
- Pakaian rapi mingguan  
- Bolos tanpa izin sebagai item terpisah (cukup lapor via Mass Report / Homeroom)  
