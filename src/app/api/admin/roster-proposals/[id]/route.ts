import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canManageRoster } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"
import { notifyEmail } from "@/lib/notify"
import { formatDisplayName } from "@/lib/format"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export async function POST(req: Request, { params }: Params) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canManageRoster)
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const decision = String(body?.decision ?? "").toUpperCase()
    if (decision !== "APPROVED" && decision !== "REJECTED") {
      return NextResponse.json({ error: "Keputusan harus APPROVED atau REJECTED" }, { status: 400 })
    }

    const db = createAdminClient()
    const { data: proposal, error: loadErr } = await db
      .from("roster_proposals")
      .select("*")
      .eq("id", id)
      .eq("class_id", ctx.classId ?? "")
      .maybeSingle()
    if (loadErr) throw new Error(loadErr.message)
    if (!proposal) return NextResponse.json({ error: "Usulan tidak ditemukan" }, { status: 404 })
    if (proposal.status !== "PENDING") {
      return NextResponse.json({ error: "Usulan sudah diproses" }, { status: 409 })
    }

    const payload = (proposal.payload ?? {}) as {
      names?: string[]
      studentId?: string
      patch?: Record<string, unknown>
    }

    if (decision === "APPROVED") {
      if (proposal.action === "ADD") {
        const names = (payload.names ?? []).filter(Boolean)
        if (names.length === 0) {
          return NextResponse.json({ error: "Usulan tambah siswa kosong" }, { status: 400 })
        }
        const rows = names.map((full_name: string) => ({
          class_id: ctx.classId,
          full_name,
          position: "ANGGOTA",
          active: true,
        }))
        const { error } = await db.from("students").insert(rows)
        if (error) throw new Error(error.message)
      } else if (proposal.action === "UPDATE" && payload.studentId && payload.patch) {
        const { error } = await db
          .from("students")
          .update(payload.patch)
          .eq("id", payload.studentId)
          .eq("class_id", ctx.classId ?? "")
        if (error) throw new Error(error.message)
      } else if (proposal.action === "DELETE" && payload.studentId) {
        const { error } = await db
          .from("students")
          .delete()
          .eq("id", payload.studentId)
          .eq("class_id", ctx.classId ?? "")
        if (error) throw new Error(error.message)
      }
    }

    const { data, error } = await db
      .from("roster_proposals")
      .update({
        status: decision,
        reviewed_by: (ctx.email ?? "").toLowerCase(),
        review_note: typeof body?.note === "string" ? body.note.trim() || null : null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw new Error(error.message)

    if (proposal.proposed_by) {
      const label =
        proposal.action === "ADD"
          ? "tambah siswa"
          : proposal.action === "UPDATE"
            ? `ubah ${formatDisplayName(String((proposal.payload as { full_name?: string })?.full_name ?? "siswa"))}`
            : `hapus ${formatDisplayName(String((proposal.payload as { full_name?: string })?.full_name ?? "siswa"))}`
      await notifyEmail(
        ctx,
        proposal.proposed_by,
        decision === "APPROVED"
          ? {
              title: "Usulan roster disetujui",
              body: `Wali kelas menyetujui usulan ${label} dan perubahan sudah diterapkan.`,
              kind: "roster_proposal",
            }
          : {
              title: "Usulan roster ditolak",
              body: `Wali kelas menolak usulan ${label}.`,
              kind: "roster_proposal",
            },
      )
    }

    return NextResponse.json(data)
  } catch (e) {
    return errorResponse(e)
  }
}
