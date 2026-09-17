// ============================================================
// Session & API helper untuk KelasKita 7B
//
// Logika otorisasi di sini murni dan bisa dites offline.
// Satu-satunya bagian yang butuh FASE 1 (next-auth + Supabase)
// adalah `contextReader` — dipasang lewat setContextReader().
//
// Pola route handler FASE 4:
//   try { const ctx = await requireApi(canPostAnnouncement); ... }
//   catch (e) { return NextResponse.json(apiError(e).body, { status: apiError(e).status }) }
// ============================================================

import { canUseApp } from "./policies"

/** Error yang membawa status HTTP + pesan ramah pengguna (bahasa Indonesia). */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

/** Identitas + role efektif pengguna untuk satu request. */
export type AppContext = {
  role: string
  name: string
  email?: string
  classId?: string
  className?: string
  studentId?: string | null
}

type ContextReader = () => Promise<AppContext | null>

let contextReader: ContextReader | null = null

/**
 * Memasang pembaca context.
 * FASE 1 memasang reader asli (getServerSession + Supabase) sekali di startup;
 * test memasang reader palsu agar guard bisa dites tanpa DB.
 */
export function setContextReader(reader: ContextReader | null): void {
  contextReader = reader
}

/** Role & nama pengguna aktif, atau null kalau belum login. */
export async function getContext(): Promise<AppContext | null> {
  if (!contextReader) return null
  return contextReader()
}

/**
 * Guard untuk route handler. Melempar ApiError bila:
 *  - belum login                          → 401
 *  - role PENDING / tidak dikenal         → 403
 *  - policy ada dan role tidak lolos      → 403
 *
 * Role efektif selalu dibaca segar per-request (lihat reader FASE 1),
 * jadi admin mengubah posisi siswa langsung berlaku tanpa re-login.
 */
export async function requireApi(policy?: (role: string) => boolean): Promise<AppContext> {
  const ctx = await getContext()
  if (!ctx) throw new ApiError(401, "Belum login")
  if (!canUseApp(ctx.role)) {
    throw new ApiError(403, "Akun belum terdaftar di kelas ini. Hubungi homeroom.")
  }
  if (policy && !policy(ctx.role)) {
    throw new ApiError(403, "Anda tidak memiliki akses untuk aksi ini")
  }
  return ctx
}

/**
 * Memformat error untuk response JSON.
 * ApiError → pesan asli + status; lainnya → pesan generik (detail tidak dibocorkan).
 */
export function apiError(err: unknown): { message: string; code?: string } {
  if (err instanceof ApiError) {
    return { message: err.message, code: err.code ?? String(err.status) }
  }
  if (err instanceof Error) {
    return { message: err.message }
  }
  return { message: "Terjadi kesalahan server" }
}