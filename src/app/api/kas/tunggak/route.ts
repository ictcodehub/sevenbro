import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canManageKas } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

/**
 * Anchor periode kas: keputusan user — hitungan mulai awal Agustus 2026
 * (hari setoran pertama Selasa, 4 Agu 2026; 1 checklist Rp 1.000 tiap Sel/Kam).
 * Data sebelum tanggal ini tidak dihitung sebagai hari setoran.
 */
const TERM_START = "2026-08-04"

/** Semua Selasa & Kamis dari `from` sampai hari ini */
function collectionDays(from: string): string[] {
  const now = new Date()
  const today = ymd(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(from + "T12:00:00")
  if (Number.isNaN(start.getTime())) return []
  const out: string[] = []
  const cur = new Date(start)
  while (ymd(cur.getFullYear(), cur.getMonth(), cur.getDate()) <= today) {
    const dow = cur.getDay()
    if (dow === 2 || dow === 4) {
      out.push(ymd(cur.getFullYear(), cur.getMonth(), cur.getDate()))
    }
    cur.setDate(cur.getDate() + 1)
  }
  return out
}

export async function GET(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canManageKas)
    const db = createAdminClient()
    const url = new URL(req.url)
    const amountPer = Number(url.searchParams.get("amountPer")) || 1000
    const classId = ctx.classId ?? ""
    const from = url.searchParams.get("from") || TERM_START

    const days = collectionDays(from)

    const { data: students } = await db
      .from("students")
      .select("id, full_name")
      .eq("class_id", classId)
      .eq("active", true)
      .order("full_name")

    const { data: payments } = await db
      .from("transactions")
      .select("description, category, occurred_on, amount, kind")
      .eq("class_id", classId)
      .eq("kind", "IN")
      .gte("occurred_on", from)

    const { data: izin } = await db
      .from("kas_izin")
      .select("student_id, occurred_on")
      .eq("class_id", classId)
      .gte("occurred_on", from)

    const izinByStudent = new Map<string, Set<string>>()
    for (const z of izin ?? []) {
      const set = izinByStudent.get(z.student_id) ?? new Set<string>()
      set.add(z.occurred_on)
      izinByStudent.set(z.student_id, set)
    }

    const list = (students ?? []).map((s) => {
      const name = s.full_name.toLowerCase()
      const pays = (payments ?? []).filter((t) => {
        if (!t.category?.startsWith("Iuran")) return false
        const d = t.description.toLowerCase()
        return d === name || d.startsWith(name + " ·") || d.includes(name)
      })
      const paid = pays.reduce((sum, t) => sum + t.amount, 0)
      const izinDays = izinByStudent.get(s.id) ?? new Set<string>()
      const forgiven = days.filter((day) => izinDays.has(day)).length

      // Utang kumulatif: (hari setoran − izin) × nominal − total sudah dibayar
      // Bayar khusus (mis. Rp 20.000) otomatis mengurangi utang lintas bulan
      const expectedDays = Math.max(0, days.length - forgiven)
      const expected = expectedDays * amountPer
      const tunggak = Math.max(0, expected - paid)

      return {
        id: s.id,
        name: s.full_name,
        paid,
        expected,
        tunggak,
        izinDays: forgiven,
        collectionDays: days.length,
        paidTimes: pays.length,
      }
    })

    const withDebt = list
      .filter((r) => r.tunggak > 0)
      .sort((a, b) => b.tunggak - a.tunggak || a.name.localeCompare(b.name))
    const totalTunggak = withDebt.reduce((s, r) => s + r.tunggak, 0)

    return NextResponse.json({
      amountPer,
      from,
      collectionDays: days.length,
      totalTunggak,
      rows: withDebt,
      all: list,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
