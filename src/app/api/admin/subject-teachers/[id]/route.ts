import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canAdmin } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  ensureContextReader()
  try {
    const session = await requireApi(canAdmin)
    const { id } = await ctx.params
    const body = await req.json().catch(() => ({}))
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    if (body?.teacher_name !== undefined) {
      patch.teacher_name = String(body.teacher_name).trim() || "-"
    }
    if (body?.active !== undefined) patch.active = Boolean(body.active)
    if (body?.subject_name !== undefined) {
      const sn = String(body.subject_name).trim()
      if (!sn) {
        return NextResponse.json({ error: "Nama mapel wajib diisi" }, { status: 400 })
      }
      patch.subject_name = sn
    }

    const { data, error } = await createAdminClient()
      .from("subject_teachers")
      .update(patch)
      .eq("id", id)
      .eq("class_id", session.classId ?? "")
      .select("id, subject_name, teacher_name, active")
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json(data)
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  ensureContextReader()
  try {
    const session = await requireApi(canAdmin)
    const { id } = await ctx.params
    const { error } = await createAdminClient()
      .from("subject_teachers")
      .delete()
      .eq("id", id)
      .eq("class_id", session.classId ?? "")
    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
