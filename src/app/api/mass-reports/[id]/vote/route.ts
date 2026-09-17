import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canVoteMassReport } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"
import { notifyEmail } from "@/lib/notify"
import { formatDisplayName } from "@/lib/format"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

/** Minimal jumlah vote agar laporan dianggap sah ditinjau (tidak harus seluruh kelas) */
const VOTE_READY_AT = 10

export async function POST(req: Request, { params }: Params) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canVoteMassReport)
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    let choice = String(body?.choice ?? "").toUpperCase()
    if (choice !== "YES" && choice !== "NO") {
      choice = body?.support === false ? "NO" : "YES"
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
    if (report.status !== "VOTING" && report.status !== "READY") {
      return NextResponse.json({ error: "Report sudah ditutup" }, { status: 409 })
    }

    const targets = Array.isArray(report.target_ids) ? (report.target_ids as string[]) : []
    if (ctx.studentId && targets.includes(String(ctx.studentId))) {
      return NextResponse.json(
        { error: "Anda tidak bisa vote untuk laporan yang menyangkut Anda" },
        { status: 403 },
      )
    }

    const email = (ctx.email ?? "").toLowerCase()
    if ((report.created_by ?? "").toLowerCase() === email) {
      return NextResponse.json(
        { error: "Pelapor tidak boleh vote pada laporannya sendiri" },
        { status: 403 },
      )
    }

    const { error: voteErr } = await db.from("mass_report_votes").upsert(
      {
        report_id: id,
        voter_email: email,
        voter_name: formatDisplayName(ctx.name) || null,
        choice,
      },
      { onConflict: "report_id,voter_email" },
    )
    if (voteErr) throw new Error(voteErr.message)

    const targetsLabel = (report.target_names as string[] | null)?.join(", ") || "target"
    await notifyEmail(ctx, email, {
      title: "Hasil vote Anda",
      body:
        choice === "YES"
          ? `Anda menyetujui vote untuk ${targetsLabel}.`
          : `Anda tidak menyetujui vote untuk ${targetsLabel}.`,
      kind: "report",
    })

    const { count: voteCount } = await db
      .from("mass_report_votes")
      .select("id", { count: "exact", head: true })
      .eq("report_id", id)
    const totalVotes = voteCount ?? 0

    const { data: yesRows } = await db
      .from("mass_report_votes")
      .select("id")
      .eq("report_id", id)
      .eq("choice", "YES")
    const yesCount = yesRows?.length ?? 0

    const threshold = VOTE_READY_AT
    if (totalVotes >= threshold && report.status === "VOTING") {
      await db.from("mass_reports").update({ status: "READY" }).eq("id", id)
    }

    return NextResponse.json({
      ok: true,
      choice,
      voteCount: totalVotes,
      yesCount,
      threshold,
      status: totalVotes >= threshold ? "READY" : "VOTING",
    })
  } catch (e) {
    return errorResponse(e)
  }
}
