import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canManageAgenda } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canManageAgenda)
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const patch: Record<string, unknown> = {}
    if (typeof body?.title === "string") {
      const title = body.title.trim()
      if (!title) return NextResponse.json({ error: "Judul tidak boleh kosong" }, { status: 400 })
      patch.title = title
    }
    if (typeof body?.starts_at === "string" && body.starts_at.trim()) {
      patch.starts_at = body.starts_at.trim()
    }
    if (typeof body?.location === "string") patch.location = body.location.trim() || null
    if (typeof body?.description === "string") patch.description = body.description.trim() || null
    if (typeof body?.ends_at === "string") patch.ends_at = body.ends_at.trim() || null
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 })
    }
    const { data, error } = await createAdminClient()
      .from("events")
      .update(patch)
      .eq("id", id)
      .eq("class_id", ctx.classId ?? "")
      .select("*")
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: "Agenda tidak ditemukan" }, { status: 404 })
    return NextResponse.json(data)
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canManageAgenda)
    const { id } = await params
    const { data, error } = await createAdminClient()
      .from("events")
      .delete()
      .eq("id", id)
      .eq("class_id", ctx.classId ?? "")
      .select("id")
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: "Agenda tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
