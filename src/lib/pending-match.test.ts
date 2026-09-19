import { describe, expect, it } from "vitest"
import { matchPendingToStudents, nameSimilarity } from "./pending-match"

const students = [
  { id: "1", full_name: "Gavriella Mulia Sitorus", email: null },
  { id: "2", full_name: "Erica Aurie", email: "erica@x.com" },
  { id: "3", full_name: "Evander Tristan Lee", email: null },
]

describe("pending-match", () => {
  it("email persis → auto", () => {
    const r = matchPendingToStudents(
      { name: "Someone", email: "Erica@X.com" },
      students,
    )
    expect(r.auto?.id).toBe("2")
    expect(r.reason).toBe("email")
  })

  it("nama lengkap persis → auto", () => {
    const r = matchPendingToStudents(
      { name: "EVANDER TRISTAN LEE", email: "new@x.com" },
      students,
    )
    expect(r.auto?.id).toBe("3")
    expect(r.reason).toBe("nama")
  })

  it("Avriel Sitorus vs Gavriella Mulia Sitorus → saran, bukan auto", () => {
    const r = matchPendingToStudents(
      { name: "Avriel Sitorus", email: "avriel@x.com" },
      students,
    )
    expect(r.auto).toBeNull()
    expect(r.suggestion?.full_name).toBe("Gavriella Mulia Sitorus")
  })

  it("nameSimilarity rendah untuk depan beda", () => {
    expect(nameSimilarity("Avriel Sitorus", "Gavriella Mulia Sitorus")).toBeLessThan(1)
  })
})
