// Reset data kelas — HAPUS poin awal (seed 25)
// Jika EXISTING_25=true, biarkan delta 25 "Poin awal kelas" saja
// Kalau false, hapus semua points lalu seed ulang 25
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

function loadEnv(path) {
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (!m) continue
      if (!(m[1] in process.env)) process.env[m[1]] = m[2]
    }
  } catch {}
}
loadEnv(".env.local")

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error("Missing Supabase env")

const db = createClient(url, key, { auth: { persistSession: false } })
const CLASS_ID = "301f54a9-cf42-4f60-b8ee-cf0c33b0b24a"
const KEEP_REASON = "Poin awal kelas"

const { data: students, error: sErr } = await db
  .from("students")
  .select("id, full_name")
  .eq("class_id", CLASS_ID)
  .eq("active", true)
if (sErr) throw new Error(sErr.message)
console.log("active students:", students.length)
const studentIds = students.map((s) => s.id)

// 1. Points: hapus SELAIN "Poin awal kelas"
if (studentIds.length > 0) {
  const { data: keep } = await db
    .from("points")
    .select("id")
    .in("student_id", studentIds)
    .eq("reason", KEEP_REASON)
  const keepIds = (keep ?? []).map((p) => p.id)
  const { data: all } = await db
    .from("points")
    .select("id")
    .in("student_id", studentIds)
  const deleteIds = (all ?? []).map((p) => p.id).filter((id) => !keepIds.includes(id))
  if (deleteIds.length > 0) {
    const { error } = await db.from("points").delete().in("id", deleteIds)
    if (error) throw new Error("points: " + error.message)
  }
  console.log(`points: keep ${keepIds.length} (poin awal), delete ${deleteIds.length}`)

  // Pastikan tiap aktif siswa punya 25 awal
  const missing = students.filter(
    (s) => !(keep ?? []).some((k) => k.id && String(k.id)),
  )
  // better: check by student
  const { data: keptRows } = await db
    .from("points")
    .select("student_id, delta, reason")
    .in("student_id", studentIds)
    .eq("reason", KEEP_REASON)
  const withInit = new Set((keptRows ?? []).map((r) => r.student_id))
  const toSeed = students.filter((s) => !withInit.has(s.id))
  if (toSeed.length > 0) {
    const { error } = await db.from("points").insert(
      toSeed.map((s) => ({
        student_id: s.id,
        kind: "PRESTASI",
        delta: 25,
        reason: KEEP_REASON,
        created_by: "system@mutiarabangsa.sch.id",
      })),
    )
    if (error) throw new Error("reseed: " + error.message)
    console.log("reseeded poin awal:", toSeed.length)
  }
  void missing
}

// 2. Kas
const t = await db.from("transactions").delete().eq("class_id", CLASS_ID).select("id")
console.log("deleted transactions:", t.data?.length ?? 0)
const iz = await db.from("kas_izin").delete().in("student_id", studentIds).select("id")
console.log("deleted kas_izin:", iz.data?.length ?? 0)

const { data: months } = await db.from("dues_months").select("id").eq("class_id", CLASS_ID)
const monthIds = (months ?? []).map((m) => m.id)
if (monthIds.length) {
  const p = await db.from("dues_payments").delete().in("month_id", monthIds).select("id")
  console.log("deleted dues_payments:", p.data?.length ?? 0)
  const m = await db.from("dues_months").delete().eq("class_id", CLASS_ID).select("id")
  console.log("deleted dues_months:", m.data?.length ?? 0)
}

// 3. Info & Agenda
const a = await db.from("announcements").delete().eq("class_id", CLASS_ID).select("id")
console.log("deleted announcements:", a.data?.length ?? 0)
const e = await db.from("events").delete().eq("class_id", CLASS_ID).select("id")
console.log("deleted events:", e.data?.length ?? 0)

// 4. Mass reports + votes
const { data: reports } = await db
  .from("mass_reports")
  .select("id")
  .eq("class_id", CLASS_ID)
const reportIds = (reports ?? []).map((r) => r.id)
if (reportIds.length) {
  const v = await db.from("mass_report_votes").delete().in("report_id", reportIds).select("id")
  console.log("deleted mass_report_votes:", v.data?.length ?? 0)
  const r = await db.from("mass_report_votes").delete().eq("report_id", reportIds[0]) // safety
  void r
}
const mr = await db.from("mass_reports").delete().eq("class_id", CLASS_ID).select("id")
console.log("deleted mass_reports:", mr.data?.length ?? 0)
const rp = await db.from("report_presets").delete().eq("class_id", CLASS_ID).select("id")
console.log("deleted report_presets:", rp.data?.length ?? 0)

// 5. Roster proposals (agar tidak nyangkut)
const prop = await db.from("roster_proposals").delete().eq("class_id", CLASS_ID).select("id")
console.log("deleted roster_proposals:", prop.data?.length ?? 0)

// 6. Notifications
const n = await db.from("notifications").delete().eq("class_id", CLASS_ID).select("id")
console.log("deleted notifications:", n.data?.length ?? 0)

// Verify
const { data: lb } = await db
  .from("student_points_total")
  .select("full_name, total_points")
  .eq("class_id", CLASS_ID)
  .order("total_points", { ascending: false })
  .limit(3)
console.log("top3 after reset:", JSON.stringify(lb))
console.log("done")
