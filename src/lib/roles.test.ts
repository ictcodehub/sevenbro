import { describe, expect, it } from "vitest"

import { resolveEffectiveRole } from "./roles"

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

  it("position tidak dikenal → PENDING", () => {
    expect(resolveEffectiveRole("STUDENT", "WAKIL")).toBe("PENDING")
  })

  it("case-sensitive: ketua huruf kecil tidak diizinkan", () => {
    expect(resolveEffectiveRole("STUDENT", "ketua")).toBe("PENDING")
  })
})
