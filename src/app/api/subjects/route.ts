import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canUseApp } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"
import { DEFAULT_SUBJECTS } from "@/lib/info-brief"

export const dynamic = "force-dynamic"

async function ensureSeed(classId: string) {
  const db = createAdminClient()
  const { data, error } = await db
    .from("subjects")
    .select("id")
    .eq("class_id", classId)
    .limit(1)
  if (error) throw new Error(error.message)
  if (data && data.length > 0) return
  const rows = DEFAULT_SUBJECTS.map((s) => ({
    class_id: classId,
    name: s.name,
    short_name: s.short_name,
    sort: s.sort,
    active: true,
  }))
  const { error: insErr } = await db.from("subjects").insert(rows)
  if (insErr && !String(insErr.message).toLowerCase().includes("duplicate")) {
    throw new Error(insErr.message)
  }
}

export async function GET() {
  ensureContextReader()
  try {
    const ctx = await requireApi(canUseApp)
    if (!ctx.classId) return NextResponse.json([])
    await ensureSeed(ctx.classId)
    const { data, error } = await createAdminClient()
      .from("subjects")
      .select("id, name, short_name, sort, active")
      .eq("class_id", ctx.classId)
      .eq("active", true)
      .order("sort", { ascending: true })
      .order("name", { ascending: true })
    if (error) throw new Error(error.message)
    return NextResponse.json(data ?? [])
  } catch (e) {
    return errorResponse(e)
  }
}
