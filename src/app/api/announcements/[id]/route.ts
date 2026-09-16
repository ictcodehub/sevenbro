import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canPostAnnouncement } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canPostAnnouncement)
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const patch: Record<string, unknown> = {}
    if (typeof body?.pinned === "boolean") patch.pinned = body.pinned
    if (typeof body?.title === "string") patch.title = body.title.trim()
    if (typeof body?.body === "string") patch.body = body.body.trim()
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 })
    }
    const { data, error } = await createAdminClient()
      .from("announcements")
      .update(patch)
      .eq("id", id)
      .eq("class_id", ctx.classId ?? "")
      .select("*")
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: "Pengumuman tidak ditemukan" }, { status: 404 })
    return NextResponse.json(data)
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canPostAnnouncement)
    const { id } = await params
    const { data, error } = await createAdminClient()
      .from("announcements")
      .delete()
      .eq("id", id)
      .eq("class_id", ctx.classId ?? "")
      .select("id")
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: "Pengumuman tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
