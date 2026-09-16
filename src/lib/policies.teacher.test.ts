import { describe, expect, it } from "vitest"

import { canGivePoints, canUseApp } from "./policies"

describe("canGivePoints — TEACHER", () => {
  it("HOMEROOM boleh", () => {
    expect(canGivePoints("HOMEROOM")).toBe(true)
  })

  it("TEACHER boleh", () => {
    expect(canGivePoints("TEACHER")).toBe(true)
  })

  it("KETUA / BENDAHARA / SEKRETARIS / ANGGOTA tidak boleh", () => {
    expect(canGivePoints("KETUA")).toBe(false)
    expect(canGivePoints("BENDAHARA")).toBe(false)
    expect(canGivePoints("SEKRETARIS")).toBe(false)
    expect(canGivePoints("ANGGOTA")).toBe(false)
  })

  it("PENDING tidak boleh", () => {
    expect(canGivePoints("PENDING")).toBe(false)
  })
})

describe("canUseApp — TEACHER", () => {
  it("TEACHER boleh pakai app", () => {
    expect(canUseApp("TEACHER")).toBe(true)
  })
})
