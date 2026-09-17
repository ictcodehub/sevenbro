import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canCreateMassReport, canVoteMassReport } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"
import { notifyHomeroom, notifyEmails } from "@/lib/notify"
import { formatDisplayName } from "@/lib/format"

export const dynamic = "force-dynamic"

const BUILTIN: Record<string, number> = {
  "Tidak Mengerjakan Piket": 1,
  "Tidak Patuh Aturan Kelas": 2,
  "Ganggu Proses Belajar": 3,
  "Kasar / Tidak Sopan": 3,
}

export async function GET() {
  ensureContextReader()
  try {
    const ctx = await requireApi(canVoteMassReport)
    const db = createAdminClient()
    const email = (ctx.email ?? "").toLowerCase()

    const { data: reports, error } = await db
      .from("mass_reports")
      .select(
        "id, reason, delta, note, target_ids, target_names, status, created_by, created_by_name, created_at, is_custom, original_reason, photo_data, photo_mime",
      )
      .eq("class_id", ctx.classId ?? "")
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)

    const { data: presets } = await db
      .from("report_presets")
      .select("id, label, delta")
      .eq("class_id", ctx.classId ?? "")
      .order("created_at", { ascending: false })
      .limit(40)

    const { data: votes } = await db
      .from("mass_report_votes")
      .select("report_id, voter_email, voter_name, choice")
      .in(
        "report_id",
        (reports ?? []).map((r) => r.id),
      )

    const byReport = new Map<
      string,
      {
        count: number
        yesCount: number
        noCount: number
        iVoted: boolean
        iChoice: string | null
        yesVoters: string[]
        noVoters: string[]
      }
    >()
    for (const v of votes ?? []) {
      const entry = byReport.get(v.report_id) ?? {
        count: 0,
        yesCount: 0,
        noCount: 0,
        iVoted: false,
        iChoice: null,
        yesVoters: [],
        noVoters: [],
      }
      entry.count += 1
      const name = formatDisplayName(v.voter_name) || v.voter_email
      const ch = (v.choice as string) || "YES"
      if (ch === "NO") {
        entry.noCount += 1
        entry.noVoters.push(name)
      } else {
        entry.yesCount += 1
        entry.yesVoters.push(name)
      }
      if ((v.voter_email ?? "").toLowerCase() === email) {
        entry.iVoted = true
        entry.iChoice = ch
      }
      byReport.set(v.report_id, entry)
    }

    const { data: students } = await db
      .from("students")
      .select("id")
      .eq("class_id", ctx.classId ?? "")
      .eq("active", true)
    // Minimal 10 vote (bukan 50% kelas) — tidak semua anak pegang HP
    const simpleThreshold = 10

    const items = (reports ?? []).map((r) => {
      const ids = Array.isArray(r.target_ids) ? (r.target_ids as string[]) : []
      const v = byReport.get(r.id) ?? {
        count: 0,
        yesCount: 0,
        noCount: 0,
        iVoted: false,
        iChoice: null,
        yesVoters: [],
        noVoters: [],
      }
      const isTarget = ids.includes((ctx.studentId as string) || "")
      return {
        id: r.id,
        reason: r.reason,
        delta: r.delta,
        note: r.note,
        target_ids: r.target_ids,
        target_names: r.target_names,
        status: r.status,
        created_by: r.created_by,
        created_by_name: r.created_by_name,
        created_at: r.created_at,
        is_custom: !!r.is_custom,
        original_reason: r.original_reason,
        hasPhoto: Boolean(r.photo_data),
        photoMime: r.photo_mime || null,
        voteCount: v.count,
        yesCount: v.yesCount,
        noCount: v.noCount,
        iVoted: v.iVoted,
        iChoice: v.iChoice,
        yesVoters: v.yesVoters,
        noVoters: v.noVoters,
        isTarget,
        isCreator: (r.created_by ?? "").toLowerCase() === email,
        threshold: simpleThreshold,
        ready: v.count >= simpleThreshold,
      }
    })

    return NextResponse.json({
      presets: [
        ...Object.entries(BUILTIN).map(([label, delta]) => ({ label, delta, builtin: true })),
        ...(presets ?? []).map((p) => ({ label: p.label, delta: p.delta, builtin: false })),
        { label: "__CUSTOM__", delta: 0, builtin: false },
      ],
      reports: items,
    })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canCreateMassReport)
    const body = await req.json().catch(() => ({}))
    const targetIds = Array.isArray(body?.targetIds)
      ? body.targetIds.map((s: unknown) => String(s).trim()).filter(Boolean)
      : []
    if (targetIds.length === 0) {
      return NextResponse.json({ error: "Pilih minimal satu siswa" }, { status: 400 })
    }

    const reason = String(body?.reason ?? "").trim()
    const isCustom = body?.isCustom === true
    if (!reason) {
      return NextResponse.json({ error: "Alasan wajib diisi" }, { status: 400 })
    }

    let delta = BUILTIN[reason]
    if (isCustom || delta === undefined) {
      delta = Math.abs(Number(body?.delta) || 1)
    }

    const photoData = typeof body?.photoData === "string" ? body.photoData : null
    const photoMime = typeof body?.photoMime === "string" ? body.photoMime : null
    if (photoData && photoData.length > 1_500_000) {
      return NextResponse.json({ error: "Foto terlalu besar (maks ~1MB setelah kompres)" }, { status: 400 })
    }

    const db = createAdminClient()
    const { data: students } = await db
      .from("students")
      .select("id, full_name")
      .in("id", targetIds)
      .eq("class_id", ctx.classId ?? "")
    const names = (students ?? []).map((s) => formatDisplayName(s.full_name))

    const { data, error } = await db
      .from("mass_reports")
      .insert({
        class_id: ctx.classId,
        reason,
        original_reason: isCustom ? reason : null,
        is_custom: isCustom,
        delta,
        note: typeof body?.note === "string" ? body.note.trim() || null : null,
        target_ids: targetIds,
        target_names: names,
        status: "VOTING",
        created_by: (ctx.email ?? "").toLowerCase(),
        created_by_name: formatDisplayName(ctx.name) || null,
        photo_data: photoData,
        photo_mime: photoMime,
      })
      .select("id, reason, delta, status, created_by, created_by_name, created_at, is_custom, original_reason")
      .single()
    if (error) throw new Error(error.message)

    await notifyHomeroom(ctx, {
      title: isCustom ? "Mass Report (custom) dibuka" : "Mass Report dibuka",
      body: `${formatDisplayName(ctx.name) || "Ketua"} membuka report: ${reason} (${names.join(", ") || "…"}). Menunggu vote kelas.`,
      kind: "report",
    })

    // Broadcast ke semua siswa aktif (kecuali target) — modal + riwayat notif
    const { data: allStudents } = await db
      .from("students")
      .select("id, email, full_name")
      .eq("class_id", ctx.classId ?? "")
      .eq("active", true)
    const recipients = (allStudents ?? [])
      .filter((s) => !targetIds.includes(s.id) && s.email)
      .map((s) => s.email as string)
    await notifyEmails(
      ctx,
      recipients,
      {
        title: "Mass Report baru — vote kelas",
        body: `“${reason}” · target: ${names.join(", ")} · Buka app untuk vote Setuju / Tidak Setuju.`,
        kind: "report",
      },
    )

    return NextResponse.json({ ...data, voteCount: 0, iVoted: false, hasPhoto: Boolean(photoData) }, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
