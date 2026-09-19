import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canUseApp } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

/** Hard-delete semua notifikasi milik user — hilang permanen dari DB */
export async function DELETE() {
  ensureContextReader()
  try {
    const ctx = await requireApi(canUseApp)
    const email = (ctx.email ?? "").toLowerCase()
    const audiences =
      ctx.role === "HOMEROOM" && email
        ? ["HOMEROOM", email]
        : ctx.role === "HOMEROOM"
          ? ["HOMEROOM"]
          : [email].filter(Boolean)
    if (!audiences.length) return NextResponse.json({ ok: true })
    await createAdminClient()
      .from("notifications")
      .delete()
      .eq("class_id", ctx.classId ?? "")
      .in("audience", audiences)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
