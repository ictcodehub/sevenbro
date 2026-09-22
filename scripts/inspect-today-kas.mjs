// Inspeksi read-only: transaksi kas yang tercatat HARI INI di kelas
// Tujuan: audit data manual input bendahara sebelum koreksi occurred_on
// Jalankan: node scripts/inspect-today-kas.mjs
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

const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
const todayStart = new Date(`${today}T00:00:00`).toISOString()

console.log("hari ini:", today)

// 1. Semua transaksi kelas dengan occurred_on = hari ini
const { data: occToday, error: e1 } = await db
  .from("transactions")
  .select("id, kind, category, description, amount, occurred_on, created_at, recorded_by")
  .eq("class_id", CLASS_ID)
  .eq("occurred_on", today)
  .order("created_at", { ascending: true })
if (e1) throw new Error(e1.message)

// 2. Transaksi yang di-CREATED hari ini (apa pun occurred_on-nya)
const { data: createdToday, error: e2 } = await db
  .from("transactions")
  .select("id, kind, category, description, amount, occurred_on, created_at, recorded_by")
  .eq("class_id", CLASS_ID)
  .gte("created_at", todayStart)
  .order("created_at", { ascending: true })
if (e2) throw new Error(e2.message)

// 3. Izin yang dibuat hari ini
const { data: izinToday, error: e3 } = await db
  .from("kas_izin")
  .select("id, student_id, occurred_on, recorded_by, created_at")
  .eq("class_id", CLASS_ID)
  .gte("created_at", todayStart)
  .order("created_at", { ascending: true })
if (e3) throw new Error(e3.message)

const { data: students } = await db
  .from("students")
  .select("id, full_name")
  .eq("class_id", CLASS_ID)
  .eq("active", true)
const nameById = new Map((students ?? []).map((s) => [s.id, s.full_name]))

const summarize = (rows) => {
  const total = rows.filter((r) => r.kind === "IN").reduce((s, r) => s + r.amount, 0)
  const byCat = {}
  for (const r of rows) byCat[r.category] = (byCat[r.category] ?? 0) + 1
  const byRecorder = {}
  for (const r of rows) byRecorder[r.recorded_by ?? "?"] = (byRecorder[r.recorded_by ?? "?"] ?? 0) + 1
  return { count: rows.length, totalIn: total, byCat, byRecorder }
}

console.log("\n=== A. occurred_on = hari ini ===")
console.log(JSON.stringify(summarize(occToday ?? []), null, 2))
console.log("sample 15 pertama:")
for (const r of (occToday ?? []).slice(0, 15)) {
  console.log(`  ${r.occurred_on} | ${r.kind} | ${r.category} | ${r.amount} | ${r.description.slice(0, 60)} | oleh ${r.recorded_by}`)
}

console.log("\n=== B. created_at >= hari ini (apa pun occurred_on) ===")
console.log(JSON.stringify(summarize(createdToday ?? []), null, 2))
const occSpread = {}
for (const r of createdToday ?? []) occSpread[r.occurred_on] = (occSpread[r.occurred_on] ?? 0) + 1
console.log("sebaran occurred_on:", JSON.stringify(occSpread))

console.log("\n=== C. kas_izin dibuat hari ini ===")
for (const z of izinToday ?? []) {
  console.log(`  ${z.occurred_on} | ${nameById.get(z.student_id) ?? z.student_id} | oleh ${z.recorded_by}`)
}
console.log("total izin hari ini:", (izinToday ?? []).length)

// 4. Konteks: berapa siswa aktif & hari setoran sejak semester
const { data: allTx } = await db
  .from("transactions")
  .select("id, kind, category, amount, occurred_on, description")
  .eq("class_id", CLASS_ID)
  .order("occurred_on", { ascending: true })
const inAll = (allTx ?? []).filter((t) => t.kind === "IN")
const totalSemester = inAll.reduce((s, t) => s + t.amount, 0)
const oldest = (allTx ?? [])[0]?.occurred_on ?? "-"
const newest = (allTx ?? []).at(-1)?.occurred_on ?? "-"
console.log("\n=== Konteks kelas ===")
console.log("siswa aktif:", students.length)
console.log("total transaksi:", (allTx ?? []).length, "| total IN semester:", totalSemester)
console.log("rentang occurred_on:", oldest, "→", newest)
