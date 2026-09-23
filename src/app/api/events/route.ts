import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canManageAgenda } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"
import { notifyHomeroom } from "@/lib/notify"
import { formatDisplayName } from "@/lib/format"
import { isEventPast } from "@/lib/events"

export const dynamic = "force-dynamic"

export async function GET() {
  ensureContextReader()
  try {
    const ctx = await requireApi()
    if (!ctx.classId) return NextResponse.json([])
    const db = createAdminClient()
    const nowMs = Date.now()
    const { data: all, error } = await db
      .from("events")
      .select("*")
      .eq("class_id", ctx.classId)
    if (error) throw new Error(error.message)
    const rows = all ?? []
    const pastIds = rows.filter((e) => isEventPast(e.starts_at, e.ends_at, nowMs)).map((e) => e.id)
    if (pastIds.length) {
      const { error: delErr } = await db.from("events").delete().in("id", pastIds)
      if (delErr) throw new Error(delErr.message)
    }
    const alive = rows.filter((e) => !pastIds.includes(e.id))
    alive.sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))
    return NextResponse.json(alive.slice(0, 100))
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canManageAgenda)
    const body = await req.json().catch(() => ({}))
    const title = String(body?.title ?? "").trim()
    const startsAt = String(body?.starts_at ?? "").trim()
    if (!title || !startsAt) {
      return NextResponse.json({ error: "Judul dan waktu mulai wajib diisi" }, { status: 400 })
    }
    const { data, error } = await createAdminClient()
      .from("events")
      .insert({
        class_id: ctx.classId,
        title,
        starts_at: startsAt,
        ends_at: body?.ends_at || null,
        location: String(body?.location ?? "").trim() || null,
        description: String(body?.description ?? "").trim() || null,
        created_by: ctx.email ?? ctx.name,
      })
      .select("*")
      .single()
    if (error) throw new Error(error.message)
    await notifyHomeroom(ctx, {
      title: "Agenda baru",
      body: `${formatDisplayName(ctx.name) || "Pengurus"} menambah agenda “${title}”.`,
      kind: "agenda",
    })
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
