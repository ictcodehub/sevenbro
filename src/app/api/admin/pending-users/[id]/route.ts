import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canAdmin } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export async function PUT(req: Request, { params }: Params) {
  ensureContextReader()
  try {
    await requireApi(canAdmin)
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const studentId = String(body?.studentId ?? "").trim()
    if (!studentId) {
      return NextResponse.json({ error: "studentId wajib" }, { status: 400 })
    }
    const db = createAdminClient()
    const { data: user } = await db
      .from("users")
      .select("email")
      .eq("id", id)
      .maybeSingle()
    if (!user?.email) {
      return NextResponse.json({ error: "Akun tidak ditemukan" }, { status: 404 })
    }
    const { data: student, error: sErr } = await db
      .from("students")
      .update({ email: user.email })
      .eq("id", studentId)
      .select("id, full_name")
      .maybeSingle()
    if (sErr) throw new Error(sErr.message)
    if (!student) {
      return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
    }
    // Trigger DB / next request akan set role STUDENT; update role eksplisit aman
    await db.from("users").update({ role: "STUDENT" }).eq("id", id)
    return NextResponse.json({ ok: true, student })
  } catch (e) {
    return errorResponse(e)
  }
}
