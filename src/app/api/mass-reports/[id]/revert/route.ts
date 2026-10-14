import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canReviewMassReport } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

/** Homeroom membatalkan status approval Mass Report dan mengembalikan poin target */
export async function POST(req: Request, { params }: Params) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canReviewMassReport)
    const { id } = await params

    const db = createAdminClient()
    const { data: report, error: loadErr } = await db
      .from("mass_reports")
      .select("*")
      .eq("id", id)
      .eq("class_id", ctx.classId ?? "")
      .maybeSingle()

    if (loadErr) throw new Error(loadErr.message)
    if (!report) return NextResponse.json({ error: "Report tidak ditemukan" }, { status: 404 })
    if (report.status !== "APPROVED") {
      return NextResponse.json({ error: "Hanya report berstatus APPROVED yang dapat dibatalkan" }, { status: 400 })
    }

    const targets = Array.isArray(report.target_ids) ? (report.target_ids as string[]) : []

    // 1. Jika points_applied true, hapus baris poin penalti yang dibuat untuk laporan ini
    if (report.points_applied && targets.length > 0) {
      // Hapus transaksi penalti dengan reason yang sama untuk siswa target
      await db
        .from("points")
        .delete()
        .eq("kind", "PELANGGARAN")
        .eq("reason", report.reason)
        .in("student_id", targets)
    }

    // 2. Kembalikan status mass report:
    // Jika jumlah vote sudah >= threshold kembalikan ke READY, jika belum kembalikan ke VOTING
    const { count: voteCount } = await db
      .from("mass_report_votes")
      .select("*", { count: "exact", head: true })
      .eq("report_id", id)

    const threshold = 10
    const nextStatus = (voteCount ?? 0) >= threshold ? "READY" : "VOTING"

    const { data, error } = await db
      .from("mass_reports")
      .update({
        status: nextStatus,
        points_applied: false,
        reviewed_by: null,
        reviewed_at: null,
        review_note: `Dibatalkan oleh wali kelas pada ${new Date().toISOString()}`,
      })
      .eq("id", id)
      .select("*")
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, report: data })
  } catch (e) {
    return errorResponse(e)
  }
}
