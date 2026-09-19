import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canUseApp } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"
import { DEFAULT_SUBJECT_TEACHERS } from "@/lib/info-brief"

export const dynamic = "force-dynamic"

async function ensureSeed(classId: string) {
  const db = createAdminClient()
  const { data, error } = await db
    .from("subject_teachers")
    .select("id")
    .eq("class_id", classId)
    .limit(1)
  if (error) throw new Error(error.message)
  if (data && data.length > 0) return
  const rows = DEFAULT_SUBJECT_TEACHERS.map((t) => ({
    class_id: classId,
    subject_name: t.subject_name,
    teacher_name: t.teacher_name,
    active: true,
  }))
  const { error: insErr } = await db.from("subject_teachers").insert(rows)
  if (insErr && !String(insErr.message).toLowerCase().includes("duplicate")) {
    throw new Error(insErr.message)
  }
}

/** Baca guru mapel — semua role aktif (form brief); Homeroom kelola via /api/admin/subject-teachers */
export async function GET() {
  ensureContextReader()
  try {
    const ctx = await requireApi(canUseApp)
    if (!ctx.classId) return NextResponse.json([])
    await ensureSeed(ctx.classId)
    const { data, error } = await createAdminClient()
      .from("subject_teachers")
      .select("id, subject_name, teacher_name, active")
      .eq("class_id", ctx.classId)
      .order("subject_name", { ascending: true })
    if (error) throw new Error(error.message)
    return NextResponse.json(data ?? [])
  } catch (e) {
    return errorResponse(e)
  }
}
