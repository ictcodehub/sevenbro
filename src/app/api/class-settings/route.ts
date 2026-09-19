import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canUseApp } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"
import { DEFAULT_CLASS_SETTINGS } from "@/lib/class-settings"

export const dynamic = "force-dynamic"

export async function GET() {
  ensureContextReader()
  try {
    const ctx = await requireApi(canUseApp)
    if (!ctx.classId) return NextResponse.json(DEFAULT_CLASS_SETTINGS)
    const db = createAdminClient()
    const { data, error } = await db
      .from("class_settings")
      .select("kas_enabled, agenda_enabled, poin_enabled, info_enabled")
      .eq("class_id", ctx.classId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json(DEFAULT_CLASS_SETTINGS)
    return NextResponse.json({
      kas_enabled: data.kas_enabled !== false,
      agenda_enabled: data.agenda_enabled !== false,
      poin_enabled: data.poin_enabled !== false,
      info_enabled: data.info_enabled !== false,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
