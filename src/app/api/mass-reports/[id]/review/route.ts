import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canReviewMassReport } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"
import { notifyEmail } from "@/lib/notify"
import { formatDisplayName } from "@/lib/format"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

/** Homeroom review: approve/reject + bisa edit deskripsi report custom */
export async function POST(req: Request, { params }: Params) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canReviewMassReport)
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const decision = String(body?.decision ?? "").toUpperCase()
    if (decision !== "APPROVED" && decision !== "REJECTED") {
      return NextResponse.json({ error: "Keputusan harus APPROVED atau REJECTED" }, { status: 400 })
    }

    const db = createAdminClient()
    const { data: report, error: loadErr } = await db
      .from("mass_reports")
      .select("*")
      .eq("id", id)
      .eq("class_id", ctx.classId ?? "")
      .maybeSingle()
    if (loadErr) throw new Error(loadErr.message)
    if (!report) return NextResponse.json({ error: "Report tidak ditemukan" }, { status: 404 })
    if (report.status !== "READY" && report.status !== "VOTING") {
      return NextResponse.json({ error: "Report sudah diproses" }, { status: 409 })
    }

    // Homeroom boleh perbaiki deskripsi sebelum apply
    const editedReason =
      typeof body?.reason === "string" && body.reason.trim()
        ? body.reason.trim()
        : report.reason

    let applied = false
    if (decision === "APPROVED") {
      const targets = Array.isArray(report.target_ids) ? (report.target_ids as string[]) : []
      if (targets.length > 0) {
        const { error: pErr } = await db.from("points").insert(
          targets.map((sid) => ({
            student_id: sid,
            kind: "PELANGGARAN",
            delta: -Math.abs(Number(report.delta) || 1),
            reason: editedReason,
            created_by: "system@mutiarabangsa.sch.id",
          })),
        )
        if (pErr) throw new Error(pErr.message)
        applied = true
      }

      // Custom → jadikan preset baru (pakai deskripsi Homeroom)
      if (report.is_custom) {
        await db.from("report_presets").insert({
          class_id: ctx.classId,
          label: editedReason,
          delta: Math.abs(Number(report.delta) || 1),
          approved_by: (ctx.email ?? "").toLowerCase(),
          source_report_id: report.id,
        })
      }

      const { data: studs } = await db
        .from("students")
        .select("id, email")
        .in("id", targets)
      for (const s of studs ?? []) {
        if (s.email) {
          await notifyEmail(ctx, s.email, {
            title: "Poin dikurangi (Mass Report)",
            body: `Wali kelas menerima report “${editedReason}” · −${report.delta} poin.`,
            kind: "report",
          })
        }
      }
    }

    const { data, error } = await db
      .from("mass_reports")
      .update({
        status: decision,
        reason: editedReason,
        reviewed_by: (ctx.email ?? "").toLowerCase(),
        review_note: typeof body?.note === "string" ? body.note.trim() || null : null,
        reviewed_at: new Date().toISOString(),
        points_applied: applied,
      })
      .eq("id", id)
      .select("*")
      .single()
    if (error) throw new Error(error.message)

    if (report.created_by) {
      await notifyEmail(ctx, report.created_by, {
        title:
          decision === "APPROVED"
            ? "Mass Report disetujui"
            : "Mass Report ditolak",
        body:
          decision === "APPROVED"
            ? `“${editedReason}” diterima — poin target sudah dikurangi.`
            : `“${report.reason}” ditolak wali kelas.`,
        kind: "report",
      })
    }

    return NextResponse.json({ ...data, actor: formatDisplayName(ctx.name) })
  } catch (e) {
    return errorResponse(e)
  }
}

