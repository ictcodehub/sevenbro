import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canAdmin, canGivePoints, canManageKas, canViewKas, canViewRoster } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  ensureContextReader()
  try {
    // Roster: admin/roster · teacher (beri poin) · bendahara (setoran/buku) · viewer kas · ketua (roster)
    const ctx = await requireApi(
      (role: string) =>
        canAdmin(role) ||
        canGivePoints(role) ||
        canManageKas(role) ||
        canViewKas(role) ||
        canViewRoster(role),
    )
    const isAdmin = canAdmin(ctx.role)
    const isRosterViewer = canViewRoster(ctx.role)
    const columns = isAdmin
      ? "id, full_name, email, nis, position, active, created_at"
      : isRosterViewer
        ? "id, full_name, email, nis, position, active"
        : "id, full_name, position, active"
    const { data, error } = await createAdminClient()
      .from("students")
      .select(columns)
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
