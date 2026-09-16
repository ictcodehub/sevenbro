import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canManageKas } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi()
    const url = new URL(req.url)
    const day = url.searchParams.get("date") || new Date().toISOString().slice(0, 10)
    const { data, error } = await createAdminClient()
      .from("kas_izin")
      .select("id, student_id, occurred_on, note, recorded_by")
      .eq("class_id", ctx.classId ?? "")
      .eq("occurred_on", day)
    if (error) throw new Error(error.message)
    return NextResponse.json(data ?? [])
  } catch (e) {
    return errorResponse(e)
  }
}

/** Tandai izin — body: { studentIds: string[], date?: string, note?: string } */
export async function POST(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canManageKas)
    const body = await req.json().catch(() => ({}))
    const ids = Array.isArray(body?.studentIds)
      ? body.studentIds.map((s: unknown) => String(s).trim()).filter(Boolean)
      : []
    const day = String(body?.date || new Date().toISOString().slice(0, 10))
    const note = String(body?.note ?? "").trim() || null

    if (ids.length === 0) {
      return NextResponse.json({ error: "Pilih minimal satu siswa" }, { status: 400 })
    }

    const rows = ids.map((student_id: string) => ({
      class_id: ctx.classId,
      student_id,
      occurred_on: day,
      note,
      recorded_by: ctx.email ?? ctx.name,
    }))

    const { data, error } = await createAdminClient()
      .from("kas_izin")
      .upsert(rows, { onConflict: "class_id,student_id,occurred_on", ignoreDuplicates: false })
      .select("id, student_id")

    if (error) throw new Error(error.message)

    return NextResponse.json(
      { ok: data?.length ?? ids.length, message: `${ids.length} siswa ditandai izin` },
      { status: 201 },
    )
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canManageKas)
    const url = new URL(req.url)
    const studentId = url.searchParams.get("studentId")
    const day = url.searchParams.get("date") || new Date().toISOString().slice(0, 10)
    if (!studentId) {
      return NextResponse.json({ error: "studentId wajib" }, { status: 400 })
    }
    const { data, error } = await createAdminClient()
      .from("kas_izin")
      .delete()
      .eq("class_id", ctx.classId ?? "")
      .eq("student_id", studentId)
      .eq("occurred_on", day)
      .select("id")
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: "Izin tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
