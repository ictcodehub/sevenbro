import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canManageKas } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"
import { notifyHomeroom } from "@/lib/notify"
import { awardKasPoint } from "@/lib/kas-points"
import { formatDisplayName, formatIDR } from "@/lib/format"

export const dynamic = "force-dynamic"

/**
 * Setoran harian — SATU baris transaksi per siswa
 * supaya Buku Kas bisa ditelusuri per nama.
 * Body: { studentIds: string[], amountPer?: number (default 1000) }
 */
export async function POST(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canManageKas)
    const body = await req.json().catch(() => ({}))
    const ids = Array.isArray(body?.studentIds)
      ? body.studentIds.map((s: unknown) => String(s).trim()).filter(Boolean)
      : []
    const amountPer = Number(body?.amountPer) || 1000

    if (ids.length === 0) {
      return NextResponse.json({ error: "Pilih minimal satu siswa" }, { status: 400 })
    }
    if (!Number.isFinite(amountPer) || amountPer <= 0) {
      return NextResponse.json({ error: "Nominal tidak valid" }, { status: 400 })
    }

    const db = createAdminClient()
    const { data: students } = await db
      .from("students")
      .select("id, full_name")
      .in("id", ids)

    // Backdate opsional: body.occurred_on "YYYY-MM-DD" (tidak boleh masa depan)
    const nowYmd = new Date().toISOString().slice(0, 10)
    const reqDate = typeof body?.occurred_on === "string" ? body.occurred_on.trim() : ""
    let occurred_on = nowYmd
    if (reqDate) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(reqDate)) {
        return NextResponse.json({ error: "Format tanggal tidak valid" }, { status: 400 })
      }
      if (reqDate > nowYmd) {
        return NextResponse.json({ error: "Tanggal tidak boleh di masa depan" }, { status: 400 })
      }
      occurred_on = reqDate
    }
    const recorded_by = ctx.email ?? ctx.name

    const rows = (students ?? []).map((s) => ({
      class_id: ctx.classId,
      kind: "IN" as const,
      category: "Iuran",
      description: s.full_name,
      amount: amountPer,
      occurred_on,
      recorded_by,
    }))

    if (rows.length === 0) {
      return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
    }

    const { error } = await db.from("transactions").insert(rows).select("*")

    if (error) throw new Error(error.message)

    // Auto +1 poin “Bayar Uang Kas” (docs/POINT_SYSTEM.md A1) — max 1× per siswa per hari
    const pointsAwarded = await awardKasPoint(
      db,
      (students ?? []).map((s) => s.id),
    )

    const total = amountPer * rows.length
    await notifyHomeroom(ctx, {
      title: "Setoran kas dicatat",
      body: `${formatDisplayName(ctx.name) || "Bendahara"} mencatat setoran ${rows.length} siswa · ${formatIDR(total)}${occurred_on !== nowYmd ? ` · tgl ${occurred_on}` : ""}${pointsAwarded > 0 ? ` · +1 poin ${pointsAwarded} siswa` : ""}.`,
      kind: "kas",
    })
    return NextResponse.json(
      {
        ok: rows.length,
        total,
        amountPer,
        pointsAwarded,
        message: `${rows.length} siswa · ${total.toLocaleString("id-ID")} tercatat`,
      },
      { status: 201 },
    )
  } catch (e) {
    return errorResponse(e)
  }
}
