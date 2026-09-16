import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canAdmin } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

const POSITIONS = ["KETUA", "BENDAHARA", "SEKRETARIS", "ANGGOTA"]

export async function PATCH(req: Request, { params }: Params) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canAdmin)
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const patch: Record<string, unknown> = {}
    if (typeof body?.position === "string") {
      if (!POSITIONS.includes(body.position)) {
        return NextResponse.json({ error: "Posisi tidak valid" }, { status: 400 })
      }
      patch.position = body.position
    }
    if (typeof body?.email === "string") patch.email = body.email.trim() || null
    if (typeof body?.nis === "string") patch.nis = body.nis.trim() || null
    if (typeof body?.active === "boolean") patch.active = body.active
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 })
    }
    const { data, error } = await createAdminClient()
      .from("students")
      .update(patch)
      .eq("id", id)
      .eq("class_id", ctx.classId ?? "")
      .select("*")
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
    return NextResponse.json(data)
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canAdmin)
    const { id } = await params
    const { data, error } = await createAdminClient()
      .from("students")
      .delete()
      .eq("id", id)
      .eq("class_id", ctx.classId ?? "")
      .select("id")
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
