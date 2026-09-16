import { describe, expect, it } from "vitest"

import { formatIDR, monthKeyWIB, monthLabel, formatDateID, formatTimeID } from "./format"

describe("formatIDR", () => {
  it("memformat angka dengan pemisah ribuan titik", () => {
    expect(formatIDR(1250000)).toBe("Rp. 1.250.000")
  })

  it("memformat nol tanpa pemisah", () => {
    expect(formatIDR(0)).toBe("Rp. 0")
  })

  it("memformat nominal kecil", () => {
    expect(formatIDR(25000)).toBe("Rp. 25.000")
  })

  it("menaruh tanda minus di depan prefix Rp", () => {
    expect(formatIDR(-75000)).toBe("-Rp. 75.000")
  })

  it("membulatkan desimal tanpa menampilkan pecahan", () => {
    expect(formatIDR(1500.4)).toBe("Rp. 1.500")
    expect(formatIDR(1500.6)).toBe("Rp. 1.501")
  })

  it("memformat angka besar", () => {
    expect(formatIDR(1250000000)).toBe("Rp. 1.250.000.000")
  })

  it("mengembalikan Rp. 0 untuk nilai non-finite (data kotor)", () => {
    expect(formatIDR(Number.NaN)).toBe("Rp. 0")
    expect(formatIDR(Number.POSITIVE_INFINITY)).toBe("Rp. 0")
  })
})

describe("monthKeyWIB", () => {
  it("memakai bulan WIB dari Date UTC", () => {
    expect(monthKeyWIB(new Date("2026-09-15T00:00:00Z"))).toBe("2026-09")
  })

  it("menerima string ISO", () => {
    expect(monthKeyWIB("2026-09-15T00:00:00Z")).toBe("2026-09")
    expect(monthKeyWIB("2026-09-15")).toBe("2026-09")
  })

  it("masih bulan sebelumnya pada 16:59:59Z (23:59:59 WIB)", () => {
    expect(monthKeyWIB(new Date("2026-01-31T16:59:59Z"))).toBe("2026-01")
  })

  it("sudah bulan berikutnya pada 17:00:00Z (00:00 WIB)", () => {
    expect(monthKeyWIB(new Date("2026-01-31T17:00:00Z"))).toBe("2026-02")
  })

  it("melewati batas tahun", () => {
    expect(monthKeyWIB(new Date("2026-12-31T18:00:00Z"))).toBe("2027-01")
  })

  it("memberi bulan dengan dua digit (leading zero)", () => {
    expect(monthKeyWIB(new Date("2026-02-05T00:00:00Z"))).toBe("2026-02")
  })

  it("memakai waktu sekarang kalau argumen kosong", () => {
    const nowWIB = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 7)
    expect(monthKeyWIB()).toBe(nowWIB)
  })

  it("mengembalikan string kosong untuk tanggal tidak valid", () => {
    expect(monthKeyWIB("bukan-tanggal")).toBe("")
    expect(monthKeyWIB(new Date(Number.NaN))).toBe("")
  })
})

describe("monthLabel", () => {
  it("menghasilkan nama bulan singkat Indonesia untuk bulan 1", () => {
    expect(monthLabel("01")).toBe("Jan")
  })

  it("menghasilkan nama bulan singkat Indonesia untuk bulan 6", () => {
    expect(monthLabel("06")).toBe("Jun")
  })

  it("menghasilkan nama bulan singkat Indonesia untuk bulan 12", () => {
    expect(monthLabel("12")).toBe("Des")
  })

  it("menerima string dua digit (leading zero)", () => {
    expect(monthLabel("09")).toBe("Sep")
    expect(monthLabel("1")).toBe("Jan")
  })

  it("mengembalikan string kosong untuk input tidak valid", () => {
    expect(monthLabel("")).toBe("")
    expect(monthLabel("abc")).toBe("")
    expect(monthLabel("0")).toBe("")
    expect(monthLabel("-")).toBe("")
  })

  it("menerima key bulan penuh YYYY-MM (dipakai /api/kas/months)", () => {
    expect(monthLabel("2026-09")).toBe("Sep")
    expect(monthLabel("2026-01")).toBe("Jan")
    expect(monthLabel("2027-12")).toBe("Des")
  })

  it("mengembalikan string kosong untuk key YYYY-MM dengan bulan di luar 1-12", () => {
    expect(monthLabel("2026-13")).toBe("")
    expect(monthLabel("2026-00")).toBe("")
  })
})

describe("formatDateID", () => {
  it("memformat hari + tanggal + bulan singkat", () => {
    expect(formatDateID(new Date("2026-09-15T00:00:00Z"))).toBe("Sel, 15 Sep")
  })

  it("memakai hari dalam seminggu versi Indonesia", () => {
    expect(formatDateID(new Date("2026-08-17T00:00:00Z"))).toBe("Sen, 17 Agu")
  })

  it("tidak memberi leading zero pada tanggal", () => {
    expect(formatDateID(new Date("2026-01-01T00:00:00Z"))).toBe("Kam, 1 Jan")
  })

  it("memakai tanggal WIB, bukan UTC (beda hari di batas tengah malam)", () => {
    expect(formatDateID(new Date("2026-01-31T17:00:00Z"))).toBe("Min, 1 Feb")
  })

  it("menangani epoch 0", () => {
    expect(formatDateID(new Date(0))).toBe("Kam, 1 Jan")
  })

  it("menangani tanggal sebelum epoch", () => {
    expect(formatDateID(new Date("1969-12-31T17:00:00Z"))).toBe("Kam, 1 Jan")
  })

  it("mengembalikan string kosong untuk tanggal tidak valid", () => {
    expect(formatDateID(new Date(Number.NaN))).toBe("")
  })
})

describe("formatTimeID", () => {
  it("memformat jam 24 jam dengan leading zero", () => {
    expect(formatTimeID(new Date("2026-09-15T00:00:00Z"))).toBe("07:00")
  })

  it("memakai menit dengan leading zero", () => {
    expect(formatTimeID(new Date("2026-09-15T00:05:00Z"))).toBe("07:05")
  })

  it("memakai waktu WIB (UTC+7)", () => {
    expect(formatTimeID(new Date("2026-09-15T10:30:00Z"))).toBe("17:30")
  })

  it("mengubah tanggal saat melewati tengah malam WIB", () => {
    expect(formatTimeID(new Date("2026-01-31T17:00:00Z"))).toBe("00:00")
  })

  it("tetap 24 jam di sore/malam (bukan 12 jam)", () => {
    expect(formatTimeID(new Date("2026-09-15T14:45:00Z"))).toBe("21:45")
  })

  it("menangani epoch 0", () => {
    expect(formatTimeID(new Date(0))).toBe("07:00")
  })

  it("mengembalikan string kosong untuk tanggal tidak valid", () => {
    expect(formatTimeID(new Date(Number.NaN))).toBe("")
  })
})
