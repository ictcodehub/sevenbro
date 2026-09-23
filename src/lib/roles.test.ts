import { describe, expect, it } from "vitest"

import { resolveEffectiveRole, formatRoleLabel } from "./roles"

describe("resolveEffectiveRole", () => {
  it("HOMEROOM tetap HOMEROOM walau ada di students", () => {
    expect(resolveEffectiveRole("HOMEROOM", "KETUA")).toBe("HOMEROOM")
    expect(resolveEffectiveRole("HOMEROOM", null)).toBe("HOMEROOM")
  })

  it("TEACHER tetap TEACHER", () => {
    expect(resolveEffectiveRole("TEACHER", null)).toBe("TEACHER")
  })

  it("STUDENT dengan position KETUA → KETUA", () => {
    expect(resolveEffectiveRole("STUDENT", "KETUA")).toBe("KETUA")
  })

  it("STUDENT dengan position BENDAHARA → BENDAHARA", () => {
    expect(resolveEffectiveRole("STUDENT", "BENDAHARA")).toBe("BENDAHARA")
  })

  it("STUDENT dengan position SEKRETARIS → SEKRETARIS", () => {
    expect(resolveEffectiveRole("STUDENT", "SEKRETARIS")).toBe("SEKRETARIS")
  })

  it("STUDENT dengan position ANGGOTA → ANGGOTA", () => {
    expect(resolveEffectiveRole("STUDENT", "ANGGOTA")).toBe("ANGGOTA")
  })

  it("STUDENT tanpa position di students → PENDING", () => {
    expect(resolveEffectiveRole("STUDENT", null)).toBe("PENDING")
  })

  it("STUDENT dengan position kosong → PENDING", () => {
    expect(resolveEffectiveRole("STUDENT", "")).toBe("PENDING")
  })

  it("PENDING → PENDING (belum terdaftar)", () => {
    expect(resolveEffectiveRole("PENDING", null)).toBe("PENDING")
    expect(resolveEffectiveRole("PENDING", "KETUA")).toBe("PENDING")
  })

  it("role DB tak dikenal → PENDING", () => {
    expect(resolveEffectiveRole("TEACH", null)).toBe("PENDING")
    expect(resolveEffectiveRole("ADMIN", null)).toBe("PENDING")
  })

  it("position bebas di luar daftar lama → role itu sendiri (bukan PENDING)", () => {
    expect(resolveEffectiveRole("STUDENT", "WAKIL")).toBe("WAKIL")
    expect(resolveEffectiveRole("STUDENT", "WAKIL KETUA")).toBe("WAKIL KETUA")
    expect(resolveEffectiveRole("STUDENT", " KETUA ")).toBe("KETUA")
  })

  it("case-sensitive: position beda case = role berbeda", () => {
    expect(resolveEffectiveRole("STUDENT", "ketua")).toBe("ketua")
  })
})

describe("formatRoleLabel", () => {
  it("memetakan kode role ke label Title Case Indonesia", () => {
    expect(formatRoleLabel("HOMEROOM")).toBe("Wali Kelas")
    expect(formatRoleLabel("TEACHER")).toBe("Guru")
    expect(formatRoleLabel("KETUA")).toBe("Ketua")
    expect(formatRoleLabel("BENDAHARA")).toBe("Bendahara")
    expect(formatRoleLabel("SEKRETARIS")).toBe("Sekretaris")
    expect(formatRoleLabel("ANGGOTA")).toBe("Anggota")
    expect(formatRoleLabel("PENDING")).toBe("Menunggu")
  })

  it("fallback: null → Siswa, role tak dikenal → Title Case", () => {
    expect(formatRoleLabel(null)).toBe("Siswa")
    expect(formatRoleLabel(undefined)).toBe("Siswa")
    expect(formatRoleLabel("ADMIN")).toBe("Admin")
    expect(formatRoleLabel("WAKIL KETUA")).toBe("Wakil Ketua")
  })
})
