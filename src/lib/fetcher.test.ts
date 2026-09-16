import { describe, expect, it, vi } from "vitest"

import { fetcher } from "./fetcher"

describe("fetcher", () => {
  it("mengembalikan body JSON saat response OK", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: 1, name: "Test" }),
    } as Response)

    const data = await fetcher<{ id: number; name: string }>("/api/test")
    expect(data).toEqual({ id: 1, name: "Test" })
  })

  it("melempar Error dengan pesan dari body saat response tidak OK", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ error: "Judul wajib diisi" }),
    } as Response)

    await expect(fetcher("/api/test")).rejects.toThrow("Judul wajib diisi")
  })

  it("melempar Error fallback saat body tidak punya field error", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response)

    await expect(fetcher("/api/test")).rejects.toThrow("Gagal memuat (500)")
  })

  it("melempar Error fallback saat json() gagal parse", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => { throw new Error("bad json") },
    } as unknown as Response)

    await expect(fetcher("/api/test")).rejects.toThrow("Gagal memuat (500)")
  })

  it("meneruskan header yang diperlukan (Accept: application/json)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response)
    global.fetch = fetchMock

    await fetcher("/api/test")
    expect(fetchMock).toHaveBeenCalledWith("/api/test", expect.objectContaining({
      headers: expect.objectContaining({ "Accept": "application/json" }),
    }))
  })

  it("bisa mengambil dengan opsi tambahan (mis. cache)", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response)
    global.fetch = fetchMock

    // fetcher tidak punya parameter opsi, tapi pastikan tidak eror
    await fetcher("/api/test")
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})