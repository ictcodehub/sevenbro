import { describe, expect, it } from "vitest"

import {
  canAdmin,
  canGivePoints,
  canManageAgenda,
  canManageKas,
  canPostAnnouncement,
  canUseApp,
} from "./policies"

// Semua role yang ada di sistem Seven Bro!
const ALL_ROLES = [
  "HOMEROOM",
  "TEACHER",
  "KETUA",
  "BENDAHARA",
  "SEKRETARIS",
  "ANGGOTA",
  "PENDING",
] as const
type Role = (typeof ALL_ROLES)[number]

const EXPECTED: Record<string, Role[]> = {
  canPostAnnouncement: ["HOMEROOM", "KETUA"],
  canManageAgenda: ["HOMEROOM", "KETUA", "SEKRETARIS"],
  canManageKas: ["HOMEROOM", "BENDAHARA"],
  canGivePoints: ["HOMEROOM", "TEACHER"],
  canAdmin: ["HOMEROOM"],
}

const FNS: Record<string, (role: string) => boolean> = {
  canPostAnnouncement,
  canManageAgenda,
  canManageKas,
  canGivePoints,
  canAdmin,
}

describe("policies", () => {
  describe.each(Object.entries(EXPECTED))("%s", (fnName, allowed) => {
    it.each(ALL_ROLES)("%s(%s) → benar", (role) => {
      expect(FNS[fnName](role)).toBe(allowed.includes(role))
    })
  })

  describe("canUseApp", () => {
    it("true untuk semua role aktif (bukan PENDING)", () => {
      expect(canUseApp("HOMEROOM")).toBe(true)
      expect(canUseApp("KETUA")).toBe(true)
      expect(canUseApp("BENDAHARA")).toBe(true)
      expect(canUseApp("SEKRETARIS")).toBe(true)
      expect(canUseApp("ANGGOTA")).toBe(true)
    })

    it("true untuk TEACHER", () => {
      expect(canUseApp("TEACHER")).toBe(true)
    })

    it("false untuk PENDING (menunggu persetujuan)", () => {
      expect(canUseApp("PENDING")).toBe(false)
    })
  })

  it("mengembalikan false untuk role tidak dikenal / tidak valid", () => {
    expect(canUseApp("")).toBe(false)
    expect(canPostAnnouncement("TEACHER")).toBe(false)
    expect(canManageAgenda("")).toBe(false)
    expect(canManageKas("ADMIN")).toBe(false)
    expect(canGivePoints("KETUA")).toBe(false)
    expect(canAdmin("KETUA")).toBe(false)
  })

  it("case-sensitive: 'homeroom' bukan 'HOMEROOM'", () => {
    expect(canPostAnnouncement("homeroom")).toBe(false)
    expect(canUseApp("homeroom")).toBe(false)
  })
})
