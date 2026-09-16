import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canAdmin } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export async function DELETE(_req: Request, { params }: Params) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canAdmin)
    const { id } = await params
    const { data, error } = await createAdminClient()
      .from("teachers")
      .delete()
      .eq("id", id)
      .eq("class_id", ctx.classId ?? "")
      .select("id")
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: "Guru tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
