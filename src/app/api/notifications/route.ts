import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canUseApp } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  ensureContextReader()
  try {
    const ctx = await requireApi(canUseApp)
    const db = createAdminClient()
    const email = (ctx.email ?? "").toLowerCase()
    // Homeroom: semua audience HOMEROOM · selain itu: notif untuk email-nya saja
    const audience = ctx.role === "HOMEROOM" ? "HOMEROOM" : email

    const { data, error } = await db
      .from("notifications")
      .select("id, title, body, kind, audience, actor_email, actor_name, created_at")
      .eq("class_id", ctx.classId ?? "")
      .eq("audience", audience)
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)

    const items = (data ?? []).map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      kind: n.kind,
      actor: n.actor_name || n.actor_email,
      created_at: n.created_at,
    }))
    return NextResponse.json(items)
  } catch (e) {
    return errorResponse(e)
  }
}
