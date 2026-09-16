import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canAdmin } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  ensureContextReader()
  try {
    const ctx = await requireApi(canAdmin)
    const { data, error } = await createAdminClient()
      .from("teachers")
      .select("id, email, name, created_at")
      .eq("class_id", ctx.classId ?? "")
      .order("created_at", { ascending: false })
    if (error) throw new Error(error.message)
    return NextResponse.json(data ?? [])
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canAdmin)
    const body = await req.json().catch(() => ({}))
    const email = String(body?.email ?? "").trim().toLowerCase()
    const name = String(body?.name ?? "").trim() || null

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

    // Whitelist: email siswa tidak boleh dijadikan guru
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

    const { data, error } = await db
      .from("teachers")
      .insert({ class_id: ctx.classId, email, name })
      .select("id, email, name")
      .single()
    if (error) {
      if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
        return NextResponse.json({ error: "Guru sudah terdaftar" }, { status: 409 })
      }
      throw new Error(error.message)
    }

    // Jika akun sudah pernah login sebagai PENDING → naikkan role
    await db
      .from("users")
      .update({ role: "TEACHER" })
      .eq("email", email)
      .eq("role", "PENDING")

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
