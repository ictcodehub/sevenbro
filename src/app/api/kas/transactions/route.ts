import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canManageKas } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"
import { formatIDR } from "@/lib/format"

export const dynamic = "force-dynamic"

export async function GET() {
  ensureContextReader()
  try {
    const ctx = await requireApi()
    const { data, error } = await createAdminClient()
      .from("transactions")
      .select("*")
      .eq("class_id", ctx.classId ?? "")
      .order("created_at", { ascending: false })
      .limit(200)
    if (error) throw new Error(error.message)
    return NextResponse.json(data ?? [])
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canManageKas)
    const body = await req.json().catch(() => ({}))
    const kind = String(body?.kind ?? "").toUpperCase()
    const category = String(body?.category ?? "").trim()
    const description = String(body?.description ?? "").trim()
    const amount = Number(body?.amount)
    if (kind !== "IN" && kind !== "OUT") {
      return NextResponse.json({ error: "Jenis harus IN atau OUT" }, { status: 400 })
    }
    if (!category || !description || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Kategori, keterangan, dan nominal wajib diisi" },
        { status: 400 },
      )
    }

    const db = createAdminClient()

    // Pengeluaran tidak boleh melebihi saldo saat ini
    if (kind === "OUT") {
      const { data: sum } = await db
        .from("class_cash_summary")
        .select("balance")
        .eq("class_id", ctx.classId ?? "")
        .maybeSingle()
      const balance = Number(sum?.balance ?? 0)
      if (Math.round(amount) > balance) {
        return NextResponse.json(
          {
            error: `Pengeluaran melebihi saldo. Saldo saat ini ${formatIDR(balance)}`,
          },
          { status: 400 },
        )
      }
    }

    const { data, error } = await db
      .from("transactions")
      .insert({
        class_id: ctx.classId,
        kind,
        category,
        description,
        amount: Math.round(amount),
        occurred_on: body?.occurred_on || new Date().toISOString().slice(0, 10),
        recorded_by: ctx.email ?? ctx.name,
      })
      .select("*")
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
