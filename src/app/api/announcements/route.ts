import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canPostAnnouncement } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  ensureContextReader()
  try {
    const ctx = await requireApi()
    if (!ctx.classId) return NextResponse.json([])
    const { data, error } = await createAdminClient()
      .from("announcements")
      .select("*")
      .eq("class_id", ctx.classId)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)
    return NextResponse.json(data ?? [])
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canPostAnnouncement)
    const body = await req.json().catch(() => ({}))
    const title = String(body?.title ?? "").trim()
    const text = String(body?.body ?? "").trim()
    const pinned = Boolean(body?.pinned)
    if (!title || !text) {
      return NextResponse.json({ error: "Judul dan isi wajib diisi" }, { status: 400 })
    }
    if (!ctx.classId) {
      return NextResponse.json({ error: "Kelas belum terkonfigurasi" }, { status: 400 })
    }
    const { data, error } = await createAdminClient()
      .from("announcements")
      .insert({
        class_id: ctx.classId,
        title,
        body: text,
        pinned,
        created_by: ctx.email ?? ctx.name,
      })
      .select("*")
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
