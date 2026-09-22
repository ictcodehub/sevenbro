import { describe, expect, it } from "vitest"
import { isSchoolEmail, normalizeEmail } from "./login-allowlist"

describe("login allowlist helpers", () => {
  it("normalizes email to lowercase trim", () => {
    expect(normalizeEmail("  Guru@Mutiarabangsa.SCH.ID ")).toBe(
      "guru@mutiarabangsa.sch.id",
    )
    expect(normalizeEmail(null)).toBe("")
    expect(normalizeEmail(undefined)).toBe("")
  })

  it("accepts only school domain", () => {
    expect(isSchoolEmail("siswa@mutiarabangsa.sch.id")).toBe(true)
    expect(isSchoolEmail("SISWA@MUTIARABANGSA.SCH.ID")).toBe(true)
    expect(isSchoolEmail("siswa@gmail.com")).toBe(false)
    expect(isSchoolEmail("siswa@mutiarabangsa.sch.id.evil.com")).toBe(false)
    expect(isSchoolEmail("")).toBe(false)
    expect(isSchoolEmail(null)).toBe(false)
  })
})
