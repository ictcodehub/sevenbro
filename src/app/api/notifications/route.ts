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
    // Homeroom: HOMEROOM + email sendiri · siswa/guru: email sendiri saja
    const audiences =
      ctx.role === "HOMEROOM" && email
        ? ["HOMEROOM", email]
        : ctx.role === "HOMEROOM"
          ? ["HOMEROOM"]
          : [email].filter(Boolean)

    const { data, error } = await db
      .from("notifications")
      .select(
        "id, title, body, kind, audience, actor_email, actor_name, created_at, deleted_at",
      )
      .eq("class_id", ctx.classId ?? "")
      .in("audience", audiences)
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)

    // Dedup: satu id sekali (anti list dobel)
    const seen = new Set<string>()
    const items = (data ?? [])
      .filter((n) => {
        if (!n.id || seen.has(n.id)) return false
        seen.add(n.id)
        return true
      })
      .map((n) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        kind: n.kind,
        actor: n.actor_name || n.actor_email,
        created_at: n.created_at,
        deleted_at: n.deleted_at ?? null,
      }))
    return NextResponse.json(items)
  } catch (e) {
    return errorResponse(e)
  }
}
