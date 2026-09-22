// Koreksi data kas: pecah transaksi "Iuran khusus" 21 Sep (input manual bendahara)
// menjadi baris kanonikal Rp 1.000 per hari setoran (Sel/Kam) mulai Selasa 4 Agu 2026.
//
// Sumber kebenaran = checklist bendahara (real), di-hardcode di bawah.
// Kelebihan slot (bayar di muka) mengalir ke hari Sel/Kam berikutnya setelah hari ini.
//
// Jalankan:
//   node scripts/fix-kas-backlog.mjs          → DRY RUN (tidak menulis apa pun)
//   node scripts/fix-kas-backlog.mjs --apply  → tulis ke database
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

const APPLY = process.argv.includes("--apply")

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) throw new Error("Missing Supabase env")

const db = createClient(url, key, { auth: { persistSession: false } })
const CLASS_ID = "301f54a9-cf42-4f60-b8ee-cf0c33b0b24a"

// ===== Parameter aturan (keputusan user) =====
const SLOT = 1000 // 1 checklist = Rp 1.000
const START = { y: 2026, m: 7, d: 4 } // Selasa, 4 Agustus 2026 (anchor awal Agustus)
const NOMINAL_LABEL = "Iuran"

// ===== Checklist bendahara (sumber kebenaran, real) =====
// kolom "Checklist" = jumlah checklist (masing-masing Rp 1.000)
const CHECKLIST = [
  ["Edmund Gracio Wirjo", 17],
  ["Erica Aurie", 16],
  ["Evander Tristan Lee", 24],
  ["Freissy Celestyn Lien", 18],
  ["Gavriella Mulia Sitorus", 17],
  ["Jesslyn Aurelia Hamsidi", 17],
  ["Jivin Wellington Priyanto", 19],
  ["Jolin khojaya", 18],
  ["keiko kholis", 19],
  ["Li Ming Xin", 14],
  ["Madeline Mellow Andrea", 17],
  ["Mishella Tjung", 19],
  ["Muhamad Dwi Andra Shakti", 21],
  ["Pauline Joice Widjadja", 20],
  ["Rebecca Christa P", 15],
  ["Wilbert Bryan", 20],
]

function ymd(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

/** Semua hari Sel/Kam dari Selasa 4 Agu 2026 maju terus, sebanyak `count` hari */
function collectionDays(count) {
  const out = []
  const cur = new Date(START.y, START.m, START.d) // Selasa
  for (let i = 0; i < count; i++) {
    out.push(ymd(cur.getFullYear(), cur.getMonth(), cur.getDate()))
    // maju ke setoran berikutnya: Kamis (dari Selasa) atau Selasa berikutnya (dari Kamis)
    cur.setDate(cur.getDate() + (cur.getDay() === 2 ? 2 : 5))
  }
  return out
}

// ===== 1. Roster: match nama checklist ke siswa di DB =====
const { data: students, error: sErr } = await db
  .from("students")
  .select("id, full_name")
  .eq("class_id", CLASS_ID)
  .eq("active", true)
if (sErr) throw new Error(sErr.message)

const norm = (s) => s.toLowerCase().replace(/[^a-z\s]/g, "").replace(/\s+/g, " ").trim()
const byNorm = new Map((students ?? []).map((s) => [norm(s.full_name), s]))

const matched = []
const unmatched = []
for (const [rawName, slots] of CHECKLIST) {
  const s = byNorm.get(norm(rawName))
  if (s) matched.push({ student: s, slots, rawName })
  else unmatched.push(rawName)
}
if (unmatched.length > 0) {
  console.error("GAGAL MATCH (stop, tidak menulis):", unmatched)
  process.exit(1)
}
const totalSlots = matched.reduce((a, b) => a + b.slots, 0)
console.log(`match: ${matched.length}/${CHECKLIST.length} siswa · total slot: ${totalSlots} (Rp ${(totalSlots * SLOT).toLocaleString("id-ID")})`)

// ===== 2. Peta hari setoran: lampau = hari sudah lewat, depan = bayar di muka =====
const now = new Date()
const todayStr = ymd(now.getFullYear(), now.getMonth(), now.getDate())

// Cukup alokasikan hingga max slot (longgar: 60 hari ke depan)
const ALL_DAYS = collectionDays(Math.max(...matched.map((m) => m.slots)) + 60)
const pastDays = ALL_DAYS.filter((d) => d <= todayStr)

// ===== 3. Siapkan baris kanonikal per siswa =====
// recorded_by diambil dari transaksi lama yang akan dihapus (pemilik data checklist)
const { data: oldTxPre } = await db
  .from("transactions")
  .select("recorded_by")
  .eq("class_id", CLASS_ID)
  .eq("kind", "IN")
  .eq("occurred_on", "2026-09-21")
const RECORDER = oldTxPre?.[0]?.recorded_by
if (!RECORDER) throw new Error("Transaksi lama 2026-09-21 tidak ditemukan / recorded_by kosong")
console.log(`recorded_by: ${RECORDER}`)
const rowsToInsert = []
const summary = []

for (const { student, slots } of matched) {
  const days = []
  for (let i = 0; i < slots; i++) days.push(ALL_DAYS[i])
  const inPast = days.filter((d) => d <= todayStr)
  const inFuture = days.filter((d) => d > todayStr)

  for (const day of days) {
    rowsToInsert.push({
      class_id: CLASS_ID,
      kind: "IN",
      category: NOMINAL_LABEL,
      description: student.full_name,
      amount: SLOT,
      occurred_on: day,
      recorded_by: RECORDER,
    })
  }
  summary.push({
    name: student.full_name,
    slots,
    past: inPast.length,
    future: inFuture.length,
    lastPast: inPast.at(-1) ?? "-",
    futureFrom: inFuture[0] ?? "-",
  })
}

console.log(`\nbaris kanonikal: ${rowsToInsert.length}`)
console.log(`hari setoran lampau (<= ${todayStr}): ${pastDays.length} hari (${pastDays[0]} → ${pastDays.at(-1)})`)
console.log("\nRingkasan per siswa (slots = past + future):")
for (const s of summary) {
  console.log(
    `  ${s.name.padEnd(28)} ${String(s.slots).padStart(3)} = ${String(s.past).padStart(2)} lampau (s.d. ${s.lastPast}) + ${String(s.future).padStart(2)} di muka (mulai ${s.futureFrom})`,
  )
}

// Sanity: past tidak melebihi jumlah hari lampau
const bad = summary.filter((s) => s.past > pastDays.length)
if (bad.length > 0) {
  console.error("ADA SISWA MELEBIHI HARI LAMPAU:", bad)
  process.exit(1)
}

// ===== 4. Transaksi lama yang dihapus =====
const { data: oldTx, error: oErr } = await db
  .from("transactions")
  .select("id, description, amount, occurred_on, category")
  .eq("class_id", CLASS_ID)
  .eq("kind", "IN")
  .eq("occurred_on", "2026-09-21")
if (oErr) throw new Error(oErr.message)
const oldTotal = (oldTx ?? []).reduce((s, t) => s + t.amount, 0)
console.log(`\ntransaksi lama 2026-09-21: ${oldTx?.length ?? 0} baris · total Rp ${oldTotal.toLocaleString("id-ID")}`)

const delta = totalSlots * SLOT - oldTotal
console.log(`delta nominal: ${delta >= 0 ? "+" : ""}${delta} (baru Rp ${(totalSlots * SLOT).toLocaleString("id-ID")})`)

if (!APPLY) {
  console.log("\n[DRY RUN] Tidak ada perubahan. Jalankan ulang dengan --apply untuk menulis.")
  process.exit(0)
}

// ===== 5. APPLY: backup → hapus lama → insert baru =====
const oldIds = (oldTx ?? []).map((t) => t.id)
if (oldIds.length > 0) {
  // backup semua kolom transaksi lama ke file JSON (untuk rollback manual)
  const { data: backupRows } = await db
    .from("transactions")
    .select("*")
    .in("id", oldIds)
  const { writeFileSync } = await import("node:fs")
  const backupPath = "scripts/backup-kas-2026-09-21.json"
  writeFileSync(backupPath, JSON.stringify(backupRows, null, 2))
  console.log(`backup ${backupRows?.length} transaksi lama → ${backupPath} ✓`)
  const { error } = await db.from("transactions").delete().in("id", oldIds)
  if (error) throw new Error("delete lama: " + error.message)
  console.log(`hapus ${oldIds.length} transaksi lama ✓`)
}

// insert batch per 500
for (let i = 0; i < rowsToInsert.length; i += 500) {
  const chunk = rowsToInsert.slice(i, i + 500)
  const { error } = await db.from("transactions").insert(chunk)
  if (error) throw new Error(`insert chunk ${i}: ` + error.message)
  console.log(`insert ${i + chunk.length}/${rowsToInsert.length} ✓`)
}

// ===== 6. Verify =====
const { data: newTx } = await db
  .from("transactions")
  .select("id, occurred_on, amount")
  .eq("class_id", CLASS_ID)
  .eq("kind", "IN")
const newTotal = (newTx ?? []).reduce((s, t) => s + t.amount, 0)
const daysSpread = {}
for (const t of newTx ?? []) daysSpread[t.occurred_on] = (daysSpread[t.occurred_on] ?? 0) + 1
console.log(`\nVERIFY: total baris IN: ${newTx?.length} · total Rp ${newTotal.toLocaleString("id-ID")}`)
console.log("sebaran occurred_on:", JSON.stringify(daysSpread, null, 0))
console.log("done")
