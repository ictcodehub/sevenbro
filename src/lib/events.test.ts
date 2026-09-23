import { describe, expect, it } from "vitest"
import { isEventPast } from "./events"

const NOW = +new Date("2026-09-23T12:00:00Z")

describe("isEventPast", () => {
  it("tanpa ends_at: lewat starts_at = past", () => {
    expect(isEventPast("2026-09-21T07:00:00Z", null, NOW)).toBe(true)
    expect(isEventPast("2026-09-24T07:00:00Z", null, NOW)).toBe(false)
    expect(isEventPast("2026-09-23T12:00:00Z", null, NOW)).toBe(false)
  })

  it("multi-day: ends_at yang menentukan", () => {
    expect(isEventPast("2026-09-01T00:00:00Z", "2026-09-22T23:59:00Z", NOW)).toBe(true)
    expect(isEventPast("2026-09-01T00:00:00Z", "2026-09-30T23:59:00Z", NOW)).toBe(false)
  })
})
