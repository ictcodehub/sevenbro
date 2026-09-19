import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canAdmin } from "@/lib/policies"
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

export async function GET() {
  ensureContextReader()
  try {
    const ctx = await requireApi(canAdmin)
    if (!ctx.classId) return NextResponse.json([])
    await ensureSeed(ctx.classId)
    const { data, error } = await createAdminClient()
      .from("subject_teachers")
      .select("id, subject_name, teacher_name, active, updated_at")
      .eq("class_id", ctx.classId)
      .order("subject_name", { ascending: true })
    if (error) throw new Error(error.message)
    return NextResponse.json(data ?? [])
  } catch (e) {
    return errorResponse(e)
  }
}

/** Upsert guru per mapel — Homeroom saja */
export async function POST(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canAdmin)
    const body = await req.json().catch(() => ({}))
    const subjectName = String(body?.subject_name ?? "").trim()
    const teacherName = String(body?.teacher_name ?? "").trim()
    const active = body?.active === undefined ? true : Boolean(body.active)

    if (!subjectName) {
      return NextResponse.json({ error: "Nama mapel wajib diisi" }, { status: 400 })
    }
    if (active && !teacherName) {
      return NextResponse.json({ error: "Nama guru wajib diisi" }, { status: 400 })
    }
    if (!ctx.classId) {
      return NextResponse.json({ error: "Kelas belum terkonfigurasi" }, { status: 400 })
    }

    const db = createAdminClient()
    const { data, error } = await db
      .from("subject_teachers")
      .upsert(
        {
          class_id: ctx.classId,
          subject_name: subjectName,
          teacher_name: teacherName || "-",
          active,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "class_id,subject_name" },
      )
      .select("id, subject_name, teacher_name, active")
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json(data, { status: 200 })
  } catch (e) {
    return errorResponse(e)
  }
}
