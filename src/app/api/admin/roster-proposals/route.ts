import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canProposeRoster, canViewRoster } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"
import { notifyHomeroom } from "@/lib/notify"
import { formatDisplayName } from "@/lib/format"

export const dynamic = "force-dynamic"

const ACTIONS = ["ADD", "UPDATE", "DELETE"] as const
const POSITIONS = ["KETUA", "BENDAHARA", "SEKRETARIS", "ANGGOTA"]

export async function GET() {
  ensureContextReader()
  try {
    const ctx = await requireApi(canViewRoster)
    const db = createAdminClient()
    let query = db
      .from("roster_proposals")
      .select("*")
      .eq("class_id", ctx.classId ?? "")
      .order("created_at", { ascending: false })
      .limit(100)
    // Ketua hanya melihat usulan miliknya
    if (ctx.role === "KETUA") {
      query = query.eq("proposed_by", (ctx.email ?? "").toLowerCase())
    }
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return NextResponse.json(data ?? [])
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canProposeRoster)
    const body = await req.json().catch(() => ({}))
    const action = String(body?.action ?? "").toUpperCase()
    if (!(ACTIONS as readonly string[]).includes(action)) {
      return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 })
    }

    const payload: Record<string, unknown> = {}
    if (action === "ADD") {
      const names = Array.isArray(body?.names)
        ? body.names.map((n: unknown) => String(n).trim()).filter(Boolean)
        : []
      const name = typeof body?.full_name === "string" ? body.full_name.trim() : ""
      const list = names.length > 0 ? names : name ? [name] : []
      if (list.length === 0) {
        return NextResponse.json({ error: "Nama siswa wajib diisi" }, { status: 400 })
      }
      payload.names = list
    } else if (action === "UPDATE") {
      const studentId = String(body?.studentId ?? "").trim()
      if (!studentId) {
        return NextResponse.json({ error: "Siswa belum dipilih" }, { status: 400 })
      }
      const patch: Record<string, unknown> = {}
      if (typeof body?.full_name === "string" && body.full_name.trim()) {
        patch.full_name = body.full_name.trim()
      }
      if (typeof body?.position === "string") {
        if (!POSITIONS.includes(body.position)) {
          return NextResponse.json({ error: "Posisi tidak valid" }, { status: 400 })
        }
        patch.position = body.position
      }
      if (typeof body?.email === "string") patch.email = body.email.trim() || null
      if (typeof body?.nis === "string") patch.nis = body.nis.trim() || null
      if (typeof body?.active === "boolean") patch.active = body.active
      if (Object.keys(patch).length === 0) {
        return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 })
      }
      payload.studentId = studentId
      payload.patch = patch
      // label = nama siswa saat ini (untuk ringkasan usulan)
      if (typeof body?.label === "string" && body.label.trim()) {
        payload.full_name = body.label.trim()
      } else if (typeof body?.full_name === "string") {
        payload.full_name = body.full_name.trim()
      }
    } else {
      const studentId = String(body?.studentId ?? "").trim()
      if (!studentId) {
        return NextResponse.json({ error: "Siswa belum dipilih" }, { status: 400 })
      }
      payload.studentId = studentId
      if (typeof body?.label === "string" && body.label.trim()) {
        payload.full_name = body.label.trim()
      } else if (typeof body?.full_name === "string") {
        payload.full_name = body.full_name.trim()
      }
    }

    const { data, error } = await createAdminClient()
      .from("roster_proposals")
      .insert({
        class_id: ctx.classId,
        action,
        student_id: action === "ADD" ? null : (payload.studentId as string),
        payload,
        status: "PENDING",
        proposed_by: (ctx.email ?? "").toLowerCase(),
        proposed_by_name: ctx.name ?? null,
      })
      .select("*")
      .single()
    if (error) throw new Error(error.message)

    const actor = formatDisplayName(ctx.name) || ctx.email || "Ketua"
    let summary = "Perubahan roster"
    if (action === "ADD") {
      const names = (payload.names as string[] | undefined) ?? []
      summary = `usul tambah ${names.length} siswa${names[0] ? ` (${formatDisplayName(names[0])}${names.length > 1 ? ", …" : ""})` : ""}`
    } else if (action === "UPDATE") {
      summary = `usul ubah ${formatDisplayName(String(payload.full_name ?? "siswa"))}`
    } else {
      summary = `usul hapus ${formatDisplayName(String(payload.full_name ?? "siswa"))}`
    }
    await notifyHomeroom(ctx, {
      title: "Usulan roster dari Ketua",
      body: `${actor} ${summary}. Buka Roster untuk menyetujui.`,
      kind: "roster_proposal",
    })

    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
