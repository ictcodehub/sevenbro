import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canManageKas } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

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

    const total = amountPer * rows.length
    return NextResponse.json(
      {
        ok: rows.length,
        total,
        amountPer,
        message: `${rows.length} siswa · ${total.toLocaleString("id-ID")} tercatat`,
      },
      { status: 201 },
    )
  } catch (e) {
    return errorResponse(e)
  }
}
