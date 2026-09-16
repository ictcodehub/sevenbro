import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canAdmin, canGivePoints } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  ensureContextReader()
  try {
    // List siswa: homeroom (roster) + teacher/homeroom (kasih poin di /scan)
    const ctx = await requireApi((role: string) => canAdmin(role) || canGivePoints(role))
    const { data, error } = await createAdminClient()
      .from("students")
      .select("id, full_name, email, nis, position, active, created_at")
      .eq("class_id", ctx.classId ?? "")
      .order("full_name", { ascending: true })
    if (error) throw new Error(error.message)
    return NextResponse.json(data ?? [])
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canAdmin)
    const body = await req.json().catch(() => ({}))
    const names = Array.isArray(body?.names)
      ? body.names.map((n: unknown) => String(n).trim()).filter(Boolean)
      : []
    if (names.length === 0) {
      return NextResponse.json({ error: "Daftar nama kosong" }, { status: 400 })
    }
    const rows = names.map((full_name: string) => ({
      class_id: ctx.classId,
      full_name,
      position: "ANGGOTA",
      active: true,
    }))
    const { data, error } = await createAdminClient()
      .from("students")
      .insert(rows)
      .select("id, full_name, email, position, active")
    if (error) throw new Error(error.message)
    return NextResponse.json(data ?? [], { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
