// ============================================================
// Fungsi format lokal untuk KelasKita 7B — Indonesia / WIB (UTC+7)
// Semua konversi zona waktu memakai shift timestamp +7 jam lalu
// dibaca dengan getter UTC — hasil konsisten di mesin timezone apa pun.
// ============================================================

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000

const INDONESIAN_DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"]

const INDONESIAN_MONTH_LABELS: Record<string, string> = {
  "1": "Jan",
  "2": "Feb",
  "3": "Mar",
  "4": "Apr",
  "5": "Mei",
  "6": "Jun",
  "7": "Jul",
  "8": "Agu",
  "9": "Sep",
  "10": "Okt",
  "11": "Nov",
  "12": "Des",
}

export function formatIDR(n: number): string {
  if (!Number.isFinite(n)) return "Rp. 0"
  const sign = n < 0 ? "-" : ""
  const abs = Math.round(Math.abs(n))
  return `${sign}Rp. ${abs.toLocaleString("id-ID")}`
}

export function monthKeyWIB(date?: Date | string): string {
  const d = date === undefined ? new Date() : new Date(date)
  if (!Number.isFinite(d.getTime())) return ""
  const wib = new Date(d.getTime() + WIB_OFFSET_MS)
  return `${wib.getUTCFullYear()}-${String(wib.getUTCMonth() + 1).padStart(2, "0")}`
}

/**
 * Menerima:
 *  - "01" s/d "12" (satu/dua digit)
 *  - "YYYY-MM" (bulan dari posisi terakhir setelah '-')
 */
export function monthLabel(m: string): string {
  if (!m) return ""
  // ambil segmen bulan dari key YYYY-MM
  const parts = m.split("-")
  const monthPart = parts[parts.length - 1] ?? ""
  const key = monthPart.replace(/^0+/, "")
  if (!key || !/^\d{1,2}$/.test(key)) return ""
  return INDONESIAN_MONTH_LABELS[key] || ""
}

export function formatDateID(d: Date): string {
  if (!Number.isFinite(d.getTime())) return ""
  const wib = new Date(d.getTime() + WIB_OFFSET_MS)
  const day  = INDONESIAN_DAYS[wib.getUTCDay()]
  const date = wib.getUTCDate()
  const month = INDONESIAN_MONTH_LABELS[String(wib.getUTCMonth() + 1)] || ""
  return `${day}, ${date} ${month}`
}

export function formatTimeID(d: Date): string {
  if (!Number.isFinite(d.getTime())) return ""
  const wib = new Date(d.getTime() + WIB_OFFSET_MS)
  const hh = String(wib.getUTCHours()).padStart(2, "0")
  const mm = String(wib.getUTCMinutes()).padStart(2, "0")
  return `${hh}:${mm}`
}