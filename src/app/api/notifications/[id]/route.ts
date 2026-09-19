import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canUseApp } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

async function loadOwned(id: string) {
  const ctx = await requireApi(canUseApp)
  const email = (ctx.email ?? "").toLowerCase()
  const db = createAdminClient()
  const { data: row } = await db
    .from("notifications")
    .select("id, audience, class_id")
    .eq("id", id)
    .maybeSingle()
  if (!row) return { ctx, db, row: null as null | { id: string } }
  const canManage =
    row.audience === email ||
    (ctx.role === "HOMEROOM" && row.audience === "HOMEROOM")
  if (!canManage) return { ctx, db, row: null as null | { id: string }, forbidden: true }
  return { ctx, db, row }
}

/** Soft-delete 1 notif — permanen di server, tetap ada di Riwayat untuk dipulihkan */
export async function DELETE(_req: Request, { params }: Params) {
  ensureContextReader()
  try {
    const { id } = await params
    const { db, row, forbidden } = await loadOwned(id)
    if (forbidden) return NextResponse.json({ error: "Tidak berwenang" }, { status: 403 })
    if (!row) return NextResponse.json({ ok: true })
    await db
      .from("notifications")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}

/** Pulihkan notif dari Riwayat (hapus soft-delete) */
export async function PATCH(_req: Request, { params }: Params) {
  ensureContextReader()
  try {
    const { id } = await params
    const { db, row, forbidden } = await loadOwned(id)
    if (forbidden) return NextResponse.json({ error: "Tidak berwenang" }, { status: 403 })
    if (!row) return NextResponse.json({ ok: true })
    await db.from("notifications").update({ deleted_at: null }).eq("id", id)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
