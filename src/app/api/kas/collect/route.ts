import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canManageKas } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"
import { notifyHomeroom } from "@/lib/notify"
import { formatDisplayName, formatIDR } from "@/lib/format"

export const dynamic = "force-dynamic"

/**
 * Setoran harian — SATU baris transaksi per siswa
 * supaya Buku Kas bisa ditelusuri per nama.
 * Body: { studentIds: string[], amountPer?: number (default 2000) }
 */
export async function POST(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canManageKas)
    const body = await req.json().catch(() => ({}))
    const ids = Array.isArray(body?.studentIds)
      ? body.studentIds.map((s: unknown) => String(s).trim()).filter(Boolean)
      : []
    const amountPer = Number(body?.amountPer) || 2000

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

    const today = new Date().toISOString().slice(0, 10)
    const recorded_by = ctx.email ?? ctx.name

    const rows = (students ?? []).map((s) => ({
      class_id: ctx.classId,
      kind: "IN" as const,
      category: "Iuran",
      description: s.full_name,
      amount: amountPer,
      occurred_on: today,
      recorded_by,
    }))

    if (rows.length === 0) {
      return NextResponse.json({ error: "Siswa tidak ditemukan" }, { status: 404 })
    }

    const { data, error } = await db
      .from("transactions")
      .insert(rows)
      .select("*")

    if (error) throw new Error(error.message)

    // Auto +1 poin “Bayar Uang Kas” (docs/POINT_SYSTEM.md A1) — max 1× per siswa per hari
    const paidIds = (students ?? []).map((s) => s.id)
    const { data: already } = await db
      .from("points")
      .select("student_id, created_at")
      .in("student_id", paidIds)
      .eq("reason", "Bayar Uang Kas")
    const todayStart = new Date(today + "T00:00:00Z").toISOString()
    const gotToday = new Set(
      (already ?? [])
        .filter((p) => p.created_at >= todayStart)
        .map((p) => p.student_id),
    )
    const toPoint = (students ?? []).filter((s) => !gotToday.has(s.id))
    if (toPoint.length > 0) {
      const { error: pErr } = await db.from("points").insert(
        toPoint.map((s) => ({
          student_id: s.id,
          kind: "PRESTASI",
          delta: 1,
          reason: "Bayar Uang Kas",
          created_by: "system@mutiarabangsa.sch.id",
        })),
      )
      if (pErr) console.warn("kas points:", pErr.message)
    }

    const total = amountPer * rows.length
    await notifyHomeroom(ctx, {
      title: "Setoran kas dicatat",
      body: `${formatDisplayName(ctx.name) || "Bendahara"} mencatat setoran ${rows.length} siswa · ${formatIDR(total)}${toPoint.length > 0 ? ` · +1 poin ${toPoint.length} siswa` : ""}.`,
      kind: "kas",
    })
    return NextResponse.json(
      {
        ok: rows.length,
        total,
        amountPer,
        pointsAwarded: toPoint.length,
        message: `${rows.length} siswa · ${total.toLocaleString("id-ID")} tercatat`,
      },
      { status: 201 },
    )
  } catch (e) {
    return errorResponse(e)
  }
}
