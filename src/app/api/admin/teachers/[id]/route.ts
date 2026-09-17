import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canAdmin } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canAdmin)
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const patch: Record<string, unknown> = {}

    if (typeof body?.name === "string") {
      patch.name = body.name.trim() || null
    }

    if (typeof body?.email === "string") {
      const email = body.email.trim().toLowerCase()
      if (!email || !email.includes("@")) {
        return NextResponse.json({ error: "Email guru tidak valid" }, { status: 400 })
      }
      if (!email.endsWith("@mutiarabangsa.sch.id")) {
        return NextResponse.json(
          { error: "Harus email sekolah @mutiarabangsa.sch.id" },
          { status: 400 },
        )
      }
      const db = createAdminClient()
      const { data: asStudent } = await db
        .from("students")
        .select("id, full_name")
        .eq("email", email)
        .maybeSingle()
      if (asStudent) {
        return NextResponse.json(
          {
            error: `Email ini terdaftar sebagai siswa (${asStudent.full_name}) — tidak boleh jadi guru`,
          },
          { status: 400 },
        )
      }
      patch.email = email
    }

    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 })
    }

    const { data, error } = await createAdminClient()
      .from("teachers")
      .update(patch)
      .eq("id", id)
      .eq("class_id", ctx.classId ?? "")
      .select("id, email, name")
      .maybeSingle()
    if (error) {
      if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
        return NextResponse.json({ error: "Email guru sudah terdaftar" }, { status: 409 })
      }
      throw new Error(error.message)
    }
    if (!data) return NextResponse.json({ error: "Guru tidak ditemukan" }, { status: 404 })
    return NextResponse.json(data)
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canAdmin)
    const { id } = await params
    const { data, error } = await createAdminClient()
      .from("teachers")
      .delete()
      .eq("id", id)
      .eq("class_id", ctx.classId ?? "")
      .select("id")
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: "Guru tidak ditemukan" }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
