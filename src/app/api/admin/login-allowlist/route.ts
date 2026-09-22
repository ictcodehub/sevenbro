import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canAdmin } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"
import { isSchoolEmail, normalizeEmail } from "@/lib/login-allowlist"

export const dynamic = "force-dynamic"

export async function GET() {
  ensureContextReader()
  try {
    await requireApi(canAdmin)
    const { data, error } = await createAdminClient()
      .from("login_allowlist")
      .select("id, email, note, created_by, created_at")
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
    const email = normalizeEmail(String(body?.email ?? ""))
    const note = String(body?.note ?? "").trim() || null

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Email tidak valid" }, { status: 400 })
    }
    if (!isSchoolEmail(email)) {
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
        { error: `Sudah terdaftar sebagai siswa (${asStudent.full_name})` },
        { status: 400 },
      )
    }

    const { data: asTeacher } = await db
      .from("teachers")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle()
    if (asTeacher) {
      return NextResponse.json(
        { error: "Sudah terdaftar di daftar Guru (Scan)" },
        { status: 400 },
      )
    }

    const { data, error } = await db
      .from("login_allowlist")
      .upsert(
        {
          email,
          note,
          created_by: ctx.email ?? ctx.name ?? null,
        },
        { onConflict: "email" },
      )
      .select("id, email, note, created_by, created_at")
      .single()
    if (error) {
      if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
        return NextResponse.json({ error: "Email sudah di whitelist" }, { status: 409 })
      }
      throw new Error(error.message)
    }

    // Akun PENDING yang sudah pernah login → naikkan role TEACHER
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

export async function DELETE(req: Request) {
  ensureContextReader()
  try {
    await requireApi(canAdmin)
    const url = new URL(req.url)
    const id = url.searchParams.get("id")
    const email = normalizeEmail(url.searchParams.get("email") ?? "")

    const db = createAdminClient()
    if (id) {
      const { error } = await db.from("login_allowlist").delete().eq("id", id)
      if (error) throw new Error(error.message)
      return NextResponse.json({ ok: true })
    }
    if (email) {
      const { error } = await db.from("login_allowlist").delete().eq("email", email)
      if (error) throw new Error(error.message)
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: "id atau email wajib" }, { status: 400 })
  } catch (e) {
    return errorResponse(e)
  }
}
