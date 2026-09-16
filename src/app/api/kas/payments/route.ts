import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canManageKas } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  ensureContextReader()
  try {
    await requireApi()
    const url = new URL(req.url)
    const monthId = url.searchParams.get("monthId")
    if (!monthId) {
      return NextResponse.json({ error: "monthId wajib" }, { status: 400 })
    }
    const { data, error } = await createAdminClient()
      .from("month_payment_status")
      .select("*")
      .eq("month_id", monthId)
      .order("full_name", { ascending: true })
    if (error) throw new Error(error.message)
    return NextResponse.json(data ?? [])
  } catch (e) {
    return errorResponse(e)
  }
}

/** Tandai bayar — satu siswa atau batch (studentIds[]) */
export async function POST(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canManageKas)
    const body = await req.json().catch(() => ({}))
    const monthId = String(body?.monthId ?? "").trim()
    const single = String(body?.studentId ?? "").trim()
    const batch = Array.isArray(body?.studentIds)
      ? body.studentIds.map((s: unknown) => String(s).trim()).filter(Boolean)
      : []
    const studentIds = batch.length > 0 ? batch : single ? [single] : []

    if (!monthId || studentIds.length === 0) {
      return NextResponse.json(
        { error: "monthId dan minimal satu siswa wajib" },
        { status: 400 },
      )
    }

    const db = createAdminClient()
    const { data: month } = await db
      .from("dues_months")
      .select("amount")
      .eq("id", monthId)
      .maybeSingle()
    if (!month) {
      return NextResponse.json({ error: "Bulan iuran tidak ditemukan" }, { status: 404 })
    }

    const recorded_by = ctx.email ?? ctx.name
    const rows = studentIds.map((student_id: string) => ({
      month_id: monthId,
      student_id,
      amount: month.amount,
      recorded_by,
    }))

    const { data, error } = await db
      .from("dues_payments")
      .insert(rows)
      .select("id, student_id, amount, paid_at, recorded_by")

    if (error) {
      // Partial batch: some already paid
      if (error.code === "23505" || /duplicate|unique/i.test(error.message)) {
        // Retry one-by-one to mark only unpaid
        const ok: unknown[] = []
        const skipped: string[] = []
        for (const row of rows) {
          const { data: one, error: e2 } = await db
            .from("dues_payments")
            .insert(row)
            .select("id, student_id")
            .single()
          if (e2) skipped.push(row.student_id)
          else ok.push(one)
        }
        return NextResponse.json(
          {
            ok: ok.length,
            skipped: skipped.length,
            message:
              skipped.length > 0
                ? `${ok.length} ditandai · ${skipped.length} sudah lunas`
                : `${ok.length} siswa ditandai lunas`,
          },
          { status: ok.length > 0 ? 201 : 409 },
        )
      }
      throw new Error(error.message)
    }

    return NextResponse.json(
      {
        ok: data?.length ?? 0,
        skipped: 0,
        message: `${data?.length ?? 0} siswa ditandai lunas`,
        recorded_by,
        paid_at: data?.[0]?.paid_at ?? new Date().toISOString(),
      },
      { status: 201 },
    )
  } catch (e) {
    return errorResponse(e)
  }
}
