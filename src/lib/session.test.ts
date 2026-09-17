import { afterEach, describe, expect, it } from "vitest"

import type { AppContext } from "./session"
import { ApiError, apiError, getContext, requireApi, setContextReader } from "./session"

function ctx(role: string, name = "Siswa 7B"): AppContext {
  return { role, name }
}

afterEach(() => {
  setContextReader(null)
})

describe("ApiError", () => {
  it("menyimpan status dan message", () => {
    const e = new ApiError(403, "Forbidden")
    expect(e.status).toBe(403)
    expect(e.message).toBe("Forbidden")
    expect(e).toBeInstanceOf(Error)
  })

  it("memakai name 'ApiError' agar bisa dibedakan dari Error biasa", () => {
    expect(new ApiError(500, "boom").name).toBe("ApiError")
  })
})

describe("getContext", () => {
  it("mengembalikan null saat belum ada reader (belum login / FASE 1 belum aktif)", async () => {
    expect(await getContext()).toBeNull()
  })

  it("mengembalikan context dari reader yang terpasang", async () => {
    setContextReader(async () => ctx("KETUA", "Andi"))
    expect(await getContext()).toEqual({ role: "KETUA", name: "Andi" })
  })

  it("mengembalikan null saat reader mengembalikan null (belum login)", async () => {
    setContextReader(async () => null)
    expect(await getContext()).toBeNull()
  })
})

describe("requireApi", () => {
  it("melempar ApiError 401 saat belum login", async () => {
    await expect(requireApi()).rejects.toThrow(ApiError)
    await expect(requireApi()).rejects.toMatchObject({ status: 401 })
  })

  it("melempar ApiError 403 saat role PENDING", async () => {
    setContextReader(async () => ctx("PENDING"))
    await expect(requireApi()).rejects.toMatchObject({
      status: 403,
      message: "Akun belum terdaftar di kelas ini. Hubungi homeroom.",
    })
  })

  it("melempar ApiError 403 untuk role yang tidak dikenal", async () => {
    setContextReader(async () => ctx("ADMIN"))
    await expect(requireApi()).rejects.toMatchObject({ status: 403 })
  })

  it("TEACHER boleh akses API (role aktif)", async () => {
    setContextReader(async () => ctx("TEACHER", "Bu Guru"))
    await expect(requireApi()).resolves.toEqual({ role: "TEACHER", name: "Bu Guru" })
  })

  it("mengembalikan context saat role aktif tanpa policy", async () => {
    setContextReader(async () => ctx("ANGGOTA"))
    await expect(requireApi()).resolves.toEqual({ role: "ANGGOTA", name: "Siswa 7B" })
  })

  it("mengembalikan context saat policy lolos", async () => {
    setContextReader(async () => ctx("HOMEROOM", "Bu Rina"))
    const canPost = (role: string) => role === "HOMEROOM" || role === "KETUA"
    await expect(requireApi(canPost)).resolves.toEqual({ role: "HOMEROOM", name: "Bu Rina" })
  })

  it("melempar ApiError 403 saat policy tidak lolos", async () => {
    setContextReader(async () => ctx("ANGGOTA"))
    const canPost = (role: string) => role === "HOMEROOM" || role === "KETUA"
    await expect(requireApi(canPost)).rejects.toMatchObject({
      status: 403,
      message: "Anda tidak memiliki akses untuk aksi ini",
    })
  })

  it("PENDING ditolak lebih dulu daripada policy (403 sebelum evaluasi policy)", async () => {
    setContextReader(async () => ctx("PENDING"))
    let policyCalled = false
    const canPost = (role: string) => {
      policyCalled = true
      return role === "HOMEROOM"
    }
    await expect(requireApi(canPost)).rejects.toMatchObject({ status: 403 })
    expect(policyCalled).toBe(false)
  })
})

describe("apiError", () => {
  it("memformat ApiError menjadi { message, code }", () => {
    expect(apiError(new ApiError(401, "Belum login"))).toEqual({
      message: "Belum login",
      code: "401",
    })
  })

  it("memakai code eksplisit bila diberikan", () => {
    expect(apiError(new ApiError(400, "Judul wajib diisi", "VALIDATION"))).toEqual({
      message: "Judul wajib diisi",
      code: "VALIDATION",
    })
  })

  it("memformat Error biasa tanpa code", () => {
    expect(apiError(new Error("network down"))).toEqual({ message: "network down" })
  })

  it("menyembunyikan detail error tak dikenal (fallback generik)", () => {
    expect(apiError("boom")).toEqual({ message: "Terjadi kesalahan server" })
    expect(apiError(null)).toEqual({ message: "Terjadi kesalahan server" })
    expect(apiError(undefined)).toEqual({ message: "Terjadi kesalahan server" })
  })
})