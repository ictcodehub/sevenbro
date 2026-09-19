import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canAdmin } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

const DEFAULTS = {
  kas_enabled: true,
  agenda_enabled: true,
  poin_enabled: true,
  info_enabled: true,
}

export async function GET() {
  ensureContextReader()
  try {
    const ctx = await requireApi(canAdmin)
    if (!ctx.classId) return NextResponse.json(DEFAULTS)
    const { data, error } = await createAdminClient()
      .from("class_settings")
      .select("kas_enabled, agenda_enabled, poin_enabled, info_enabled, updated_at")
      .eq("class_id", ctx.classId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ ...DEFAULTS, updated_at: null })
    return NextResponse.json({
      kas_enabled: data.kas_enabled !== false,
      agenda_enabled: data.agenda_enabled !== false,
      poin_enabled: data.poin_enabled !== false,
      info_enabled: data.info_enabled !== false,
      updated_at: data.updated_at,
    })
  } catch (e) {
    return errorResponse(e)
  }
}

/** Upsert toggle fitur — Homeroom saja */
export async function POST(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canAdmin)
    if (!ctx.classId) {
      return NextResponse.json({ error: "Kelas belum terkonfigurasi" }, { status: 400 })
    }
    const body = await req.json().catch(() => ({}))
    const patch: Record<string, boolean> = {}
    if (typeof body?.kas_enabled === "boolean") patch.kas_enabled = body.kas_enabled
    if (typeof body?.agenda_enabled === "boolean") patch.agenda_enabled = body.agenda_enabled
    if (typeof body?.poin_enabled === "boolean") patch.poin_enabled = body.poin_enabled
    if (typeof body?.info_enabled === "boolean") patch.info_enabled = body.info_enabled
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 })
    }

    const db = createAdminClient()
    const { data: existing } = await db
      .from("class_settings")
      .select("class_id")
      .eq("class_id", ctx.classId)
      .maybeSingle()

    const row = {
      class_id: ctx.classId,
      ...patch,
      updated_at: new Date().toISOString(),
    }

    let data
    let error
    if (existing) {
      const res = await db
        .from("class_settings")
        .update(row)
        .eq("class_id", ctx.classId)
        .select("kas_enabled, agenda_enabled, poin_enabled, info_enabled")
        .single()
      data = res.data
      error = res.error
    } else {
      const res = await db
        .from("class_settings")
        .insert({ ...DEFAULTS, ...row })
        .select("kas_enabled, agenda_enabled, poin_enabled, info_enabled")
        .single()
      data = res.data
      error = res.error
    }
    if (error) throw new Error(error.message)
    return NextResponse.json(data)
  } catch (e) {
    return errorResponse(e)
  }
}
