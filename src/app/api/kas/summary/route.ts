import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"
import { monthKeyWIB } from "@/lib/format"

export const dynamic = "force-dynamic"

function firstName(name: string) {
  const w = name.trim().split(/\s+/)
  return w[0] || name
}

/** email → nama depan saja (Madeline, Pauline, Tio) */
function actorLabel(raw: string | null, nameMap: Map<string, string>): string {
  if (!raw) return "—"
  const key = raw.trim().toLowerCase()
  const byEmail = nameMap.get(key)
  if (byEmail) return firstName(byEmail)
  if (key.includes("@")) return firstName(key.split("@")[0])
  return firstName(raw)
}

export async function GET() {
  ensureContextReader()
  try {
    const ctx = await requireApi()
    const db = createAdminClient()
    const classId = ctx.classId ?? ""

    const { data: sum } = await db
      .from("class_cash_summary")
      .select("balance")
      .eq("class_id", classId)
      .maybeSingle()

    const mk = monthKeyWIB()
    const { data: month } = await db
      .from("dues_months")
      .select("id, title, amount, month_key")
      .eq("class_id", classId)
      .eq("month_key", mk)
      .maybeSingle()

    let paidCount = 0
    let totalCount = 0
    let myPaid: number | null = null

    if (month) {
      const { count } = await db
        .from("month_payment_status")
        .select("payment_id", { count: "exact", head: true })
        .eq("month_id", month.id)
        .not("payment_id", "is", null)
      paidCount = count ?? 0

      const { count: total } = await db
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("class_id", classId)
        .eq("active", true)
      totalCount = total ?? 0

      if (ctx.studentId) {
        const { data: mine } = await db
          .from("month_payment_status")
          .select("paid_amount")
          .eq("month_id", month.id)
          .eq("student_id", ctx.studentId)
          .maybeSingle()
        myPaid = mine?.paid_amount ?? 0
      }
    }

    const { data: recent } = await db
      .from("transactions")
      .select("*")
      .eq("class_id", classId)
      .order("created_at", { ascending: false })
      .limit(30)

    // Arus kas bulan ini (dari transaksi)
    let monthIn = 0
    let monthOut = 0
    const monthStart = `${mk}-01`
    for (const t of recent ?? []) {
      const day = String(t.occurred_on ?? "").slice(0, 10)
      if (day >= monthStart) {
        if (t.kind === "IN") monthIn += t.amount
        else monthOut += t.amount
      }
    }

    // Aktivitas terakhir (transaksi atau pembayaran iuran) — audit
    const lastTx = recent?.[0] ?? null
    let lastPayment: {
      paid_at: string
      recorded_by: string
      amount: number
      full_name: string
    } | null = null
    if (month) {
      const { data: pays } = await db
        .from("dues_payments")
        .select("amount, paid_at, recorded_by, students(full_name)")
        .eq("month_id", month.id)
        .order("paid_at", { ascending: false })
        .limit(1)
      const p = pays?.[0] as
        | {
            amount: number
            paid_at: string
            recorded_by: string
            students?: { full_name?: string } | { full_name?: string }[] | null
          }
        | undefined
      if (p?.paid_at) {
        const st = p.students as { full_name?: string } | { full_name?: string }[] | null
        const full_name = Array.isArray(st) ? (st[0]?.full_name ?? "Siswa") : (st?.full_name ?? "Siswa")
        lastPayment = {
          paid_at: p.paid_at,
          recorded_by: p.recorded_by || "",
          amount: p.amount,
          full_name,
        }
      }
    }

    // Map email → nama dari users + homeroom + aktor request
    const emails = new Set<string>()
    if (lastTx?.recorded_by) emails.add(lastTx.recorded_by.toLowerCase())
    if (lastPayment?.recorded_by) emails.add(lastPayment.recorded_by.toLowerCase())
    for (const t of recent ?? []) {
      if (t.recorded_by) emails.add(t.recorded_by.toLowerCase())
    }
    const nameMap = new Map<string, string>()
    if (emails.size > 0) {
      const { data: users } = await db
        .from("users")
        .select("email, name")
        .in("email", [...emails])
      for (const u of users ?? []) {
        if (u.email && u.name) nameMap.set(u.email.toLowerCase(), u.name)
      }
    }
    if (ctx.email && ctx.name) nameMap.set(ctx.email.toLowerCase(), ctx.name)

    // Audit dari dua sumber — pilih yang paling baru
    type Audit = {
      kind: "tx" | "payment"
      at: string
      by: string
      label: string
      amount: number
      direction?: "IN" | "OUT"
    }
    let lastActivity: Audit | null = null
    if (lastTx) {
      lastActivity = {
        kind: "tx",
        at: lastTx.created_at,
        by: actorLabel(lastTx.recorded_by, nameMap),
        label: lastTx.description || lastTx.category,
        amount: lastTx.amount,
        direction: lastTx.kind,
      }
    }
    if (lastPayment?.paid_at) {
      const auditPay: Audit = {
        kind: "payment",
        at: lastPayment.paid_at,
        by: actorLabel(lastPayment.recorded_by, nameMap),
        label: `Iuran ${lastPayment.full_name}`,
        amount: lastPayment.amount,
        direction: "IN",
      }
      if (!lastActivity || auditPay.at > lastActivity.at) {
        lastActivity = auditPay
      }
    }

    return NextResponse.json({
      balance: sum?.balance ?? 0,
      month,
      paidCount,
      totalCount,
      myPaid,
      recent: recent ?? [],
      monthIn,
      monthOut,
      lastActivity,
      role: ctx.role,
      actor: { name: ctx.name, email: ctx.email },
    })
  } catch (e) {
    return errorResponse(e)
  }
}
