"use client"

import { useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  User,
  X,
} from "lucide-react"
import { EmptyState } from "@/components/ui-primitives"
import { useAppSWR } from "@/lib/fetcher"
import { formatIDR, formatDateID, formatDateCompactID, formatTimeID, formatDisplayName } from "@/lib/format"
import { RoleGate } from "@/components/RoleGate"
import { useT } from "@/lib/i18n"

type Tx = {
  id: string
  kind: "IN" | "OUT"
  category: string
  description: string
  amount: number
  occurred_on: string
  created_at: string
  recorded_by: string | null
}

type LedgerRow = Tx & { saldo: number }

/** Buku Kas: manage view tetap untuk semua yang boleh lihat kas (read-only) */
const PAGE_ROLES = ["HOMEROOM", "BENDAHARA", "KETUA", "SEKRETARIS", "ANGGOTA"]

function sortKey(t: Tx) {
  const time = (t.created_at.split("T")[1] ?? "00:00:00").slice(0, 8)
  return `${t.occurred_on}T${time}`
}

/** Entri batch lama: "Rabu · 15 siswa · Nama1, Nama2…" → "Rabu · 15 siswa" */
function shortUraian(t: Tx) {
  const d = t.description || t.category
  const m = d.match(/^(.+?·\s*\d+\s*siswa)\b/i)
  return m ? m[1] : d
}

const DOW_FULL = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
const MONTHS_FULL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]

/** "2026-09-16" → "Rabu, 16 September 2026" */
function fullDate(iso?: string | null) {
  if (!iso) return "—"
  const d = new Date(iso.length === 10 ? iso + "T12:00:00" : iso)
  if (Number.isNaN(d.getTime())) return "—"
  return `${DOW_FULL[d.getDay()]}, ${d.getDate()} ${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`
}

/** "2026-09-16" → "16 Sep" */
function dmy(iso?: string | null) {
  if (!iso) return "—"
  const months = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"]
  const [y, m, d] = iso.slice(0, 10).split("-")
  if (!y || !m || !d) return "—"
  const mi = parseInt(m, 10) - 1
  return `${d} ${months[mi] ?? m}`
}

/** Nominal selalu pakai "Rp." */
function rp(n: number) {
  return formatIDR(n)
}

/**
 * Level bayar bulanan (target 8x = 2x/minggu × 4):
 * 0 merah · 2 cokelat · 4 kuning · 6 oranye · ≥8 hijau
 */
function payLevel(times: number) {
  if (times <= 0) return { cls: "text-alert", bg: "" }
  if (times < 3) return { cls: "text-amber-800", bg: "" }
  if (times < 5) return { cls: "text-amber-500", bg: "" }
  if (times < 7) return { cls: "text-orange-500", bg: "" }
  return { cls: "text-forest", bg: "bg-forest/8" }
}

function ymd(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
]
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

type DayMarks = { IN: boolean; OUT: boolean }

function buildDayMarks(rows: Tx[]): Map<string, DayMarks> {
  const map = new Map<string, DayMarks>()
  for (const t of rows) {
    const prev = map.get(t.occurred_on) ?? { IN: false, OUT: false }
    if (t.kind === "IN") prev.IN = true
    else prev.OUT = true
    map.set(t.occurred_on, prev)
  }
  return map
}

function MiniCalendar({
  selected,
  dayMarks,
  onSelect,
  onClose,
  top,
}: {
  selected: string
  dayMarks: Map<string, DayMarks>
  onSelect: (ymd: string) => void
  onClose: () => void
  top: number
}) {
  const t = useT()
  const now = selected ? new Date(selected + "T12:00:00") : new Date()
  const [viewY, setViewY] = useState(now.getFullYear())
  const [viewM, setViewM] = useState(now.getMonth())

  const first = new Date(viewY, viewM, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(viewY, viewM + 1, 0).getDate()
  const todayStr = ymd(new Date().getFullYear(), new Date().getMonth(), new Date().getDate())

  const cells: (number | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <>
      {/* Scrim — tutup kalau tap di luar */}
      <button
        type="button"
        aria-label={t("kas.closeCalendar")}
        onClick={onClose}
        className="fixed inset-0 z-30"
      />
      {/* Panel: lebar area konten (margin kiri-kanan), di bawah header */}
      <div
        className="fixed left-3 right-3 z-40 bg-white border border-line rounded-2xl shadow-lg px-3 py-3"
        style={{ top }}
      >
        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => {
              if (viewM === 0) {
                setViewM(11)
                setViewY((y) => y - 1)
              } else setViewM((m) => m - 1)
            }}
            className="p-1 text-ink-soft"
            aria-label={t("kas.prevMonth")}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-xs font-semibold text-ink">
            {MONTHS_ID[viewM]} {viewY}
          </p>
          <button
            type="button"
            onClick={() => {
              if (viewM === 11) {
                setViewM(0)
                setViewY((y) => y + 1)
              } else setViewM((m) => m + 1)
            }}
            className="p-1 text-ink-soft"
            aria-label={t("kas.nextMonth")}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {DOW.map((d) => (
            <span
              key={d}
              className="text-center text-[11px] font-medium text-ink-soft/50 py-0.5"
            >
              {d}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <span key={`e${i}`} />
            const day = ymd(viewY, viewM, d)
            const marks = dayMarks.get(day)
            const isSel = day === selected
            const isToday = day === todayStr
            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  onSelect(day)
                  onClose()
                }}
                className={`relative h-10 rounded-lg text-xs font-medium flex flex-col items-center justify-center transition ${
                  isSel
                    ? "bg-forest text-white"
                    : isToday
                      ? "bg-forest/10 text-forest"
                      : "text-ink active:bg-page"
                }`}
              >
                {d}
                {(marks?.IN || marks?.OUT) && (
                  <span className="absolute bottom-0.5 flex gap-0.5">
                    {marks.IN && (
                      <span
                        className={`h-0.5 w-0.5 rounded-full ${isSel ? "bg-white" : "bg-forest"}`}
                      />
                    )}
                    {marks.OUT && (
                      <span
                        className={`h-0.5 w-0.5 rounded-full ${isSel ? "bg-amber" : "bg-alert"}`}
                      />
                    )}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-2 pt-2 border-t border-line/50 flex items-center gap-4 text-xs text-ink-soft/60">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-forest" /> {t("home.in")}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-alert" /> {t("home.out")}
          </span>
          <button
            type="button"
            onClick={() => {
              onSelect("")
              onClose()
            }}
            className="ml-auto text-forest font-semibold"
          >
            {t("kas.allMonths")}
          </button>
        </div>
      </div>
    </>
  )
}

export default function BukuKasPage() {
  return (
    <RoleGate allow={PAGE_ROLES}>
      <BukuKasInner />
    </RoleGate>
  )
}

function BukuKasInner() {
  const { data: rows, error, mutate } = useAppSWR<Tx[]>(
    "/api/kas/transactions",
    undefined,
    { refreshInterval: 20000 },
  )

  const t = useT()
  const [only, setOnly] = useState<"all" | "IN" | "OUT">("all")
  // Default: semua bulan (bukan filter bulan berjalan)
  const [date, setDate] = useState("")
  const [calOpen, setCalOpen] = useState(false)
  const calBtnRef = useRef<HTMLButtonElement>(null)
  const [calTop, setCalTop] = useState(0)
  const [detail, setDetail] = useState<Tx | null>(null)
  const [detailAgg, setDetailAgg] = useState<{
    total: number
    count: number
    day: string
    label: string
  } | null>(null)
  const [dayStatus, setDayStatus] = useState<{
    bayar: string[]
    izin: string[]
    nunggak: string[]
  } | null>(null)
  const [dayStatusLoading, setDayStatusLoading] = useState(false)

  const isIuranTx = (t: Tx | null) =>
    t?.kind === "IN" &&
    (t.category === "Iuran" ||
      t.category === "Iuran harian" ||
      t.category === "Iuran khusus")

  const openDetail = async (t: Tx) => {
    setDetail(t)
    setDayStatus(null)
    setDetailAgg(null)
    if (!isIuranTx(t) || !students?.length) return
    setDayStatusLoading(true)
    try {
      const day = t.occurred_on
      const dayIuran = (rows ?? []).filter(
        (r) =>
          r.kind === "IN" &&
          r.occurred_on === day &&
          r.category.startsWith("Iuran"),
      )
      const paidIds = new Set<string>()
      const roster = new Set(students.map((s) => s.full_name.toLowerCase()))
      for (const r of dayIuran) {
        const d = r.description.trim().toLowerCase()
        if (roster.has(d)) paidIds.add(d)
        else if (/·\s*\d+\s*siswa\b/i.test(d)) continue
        else {
          for (const n of roster) {
            if (d === n || d.startsWith(n + " ·") || d.includes(n)) {
              paidIds.add(n)
              break
            }
          }
        }
      }
      const total = dayIuran.reduce((s, r) => s + r.amount, 0)
      const count = paidIds.size
      const totalSiswa = students.length
      const label = `${count}/${totalSiswa} Siswa`
      setDetailAgg({ total, count, day, label })
      setDetail({
        ...t,
        description: label,
        category: "Iuran harian",
        amount: total,
      })

      const izinRes = await fetch(`/api/kas/izin?date=${day}`, {
        headers: { Accept: "application/json" },
      })
      const izinList = izinRes.ok
        ? ((await izinRes.json()) as { student_id: string }[])
        : []
      const izinIdSet = new Set(izinList.map((z) => z.student_id))

      const bayar: string[] = []
      const izin: string[] = []
      const nunggak: string[] = []
      for (const s of students) {
        if (izinIdSet.has(s.id)) izin.push(s.full_name)
        else if (paidIds.has(s.full_name.toLowerCase())) bayar.push(s.full_name)
        else nunggak.push(s.full_name)
      }
      setDayStatus({ bayar, izin, nunggak })
    } catch {
      setDayStatus(null)
    } finally {
      setDayStatusLoading(false)
    }
  }
  const [view, setView] = useState<"matriks" | "siswa" | "ledger">("matriks")
  const [period, setPeriod] = useState<"week" | "month" | "all">("month")
  const { data: students } = useAppSWR<
    { id: string; full_name: string; position: string }[]
  >("/api/admin/students", undefined, { refreshInterval: 60000 })

  const dayMarks = useMemo(() => buildDayMarks(rows ?? []), [rows])

  // Navigasi bulan cepat via panah ‹ › (tanpa buka kalender)
  const shiftMonth = (delta: number) => {
    const nowD = new Date()
    const base = date
      ? `${date.slice(0, 4)}-${date.slice(5, 7)}`
      : `${nowD.getFullYear()}-${String(nowD.getMonth() + 1).padStart(2, "0")}`
    const [y, m] = base.split("-").map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`)
  }

  // Batas waktu periode rekap (inclusive)
  const periodFrom = useMemo(() => {
    if (period === "all") return null
    const now = new Date()
    if (period === "week") {
      const d = new Date(now)
      const day = d.getDay() || 7
      d.setDate(d.getDate() - day + 1) // Senin minggu ini
      return d.toISOString().slice(0, 10)
    }
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`
  }, [period])

  // Rekap per siswa dari transaksi IN pada periode terpilih
  const perSiswa = useMemo(() => {
    const inc = (rows ?? []).filter((t) => {
      if (t.kind !== "IN") return false
      if (periodFrom && t.occurred_on < periodFrom) return false
      return true
    })
    return (students ?? []).map((s) => {
      const name = s.full_name.toLowerCase()
      const pays = inc.filter((t) => {
        const d = t.description.toLowerCase()
        return d === name || d.startsWith(name + " ·") || d.includes(name)
      })
      const total = pays.reduce((sum, t) => sum + t.amount, 0)
      const last = pays
        .map((t) => t.occurred_on)
        .sort()
        .at(-1)
      return {
        id: s.id,
        name: formatDisplayName(s.full_name),
        position: s.position,
        times: pays.length,
        total,
        last,
      }
    }).sort((a, b) => a.times - b.times || a.name.localeCompare(b.name))
  }, [rows, students, periodFrom])

  // Filter tanggal → per BUKAN (bukan per hari saja)
  const dateMonth = date ? date.slice(0, 7) : ""

  // Matriks: hormati selector bulan — hanya minggu dalam bulan terpilih (atau bulan berjalan).
  // Lunas = Rp 23.000 (total sepanjang waktu). Sel = 0/1/2 per minggu bulan itu saja.
  const matriks = useMemo(() => {
    const NOMINAL = 1000
    // Lunas dinamis = jumlah hari setoran Sel/Kam sejak anchor awal Agustus s.d. hari ini
    const TERM_START = "2026-08-04"
    const now0 = new Date()
    const todayStr0 = ymd(now0.getFullYear(), now0.getMonth(), now0.getDate())
    let LUNAS_SLOTS = 0
    for (
      let d = new Date(TERM_START + "T12:00:00");
      ymd(d.getFullYear(), d.getMonth(), d.getDate()) <= todayStr0;
      d.setDate(d.getDate() + 1)
    ) {
      const dow = d.getDay()
      if (dow === 2 || dow === 4) LUNAS_SLOTS += 1
    }
    const BATCH_RE = /·\s*(\d+)\s*siswa\b/i

    const now = new Date()
    const ym = dateMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
    const [y0, m0] = ym.split("-").map(Number)
    const year = y0 || now.getFullYear()
    const month = (m0 || now.getMonth() + 1) - 1

    // Minggu Senin–Minggu yang menyentuh bulan terpilih
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0)
    const startMon = new Date(monthStart)
    startMon.setDate(startMon.getDate() - ((startMon.getDay() + 6) % 7))

    const weekRanges: { from: string; to: string; label: string }[] = []
    const cur = new Date(startMon)
    while (cur <= monthEnd) {
      const wStart = new Date(cur)
      const wEnd = new Date(cur)
      wEnd.setDate(wEnd.getDate() + 6)
      if (wEnd >= monthStart && wStart <= monthEnd) {
        const label = `${wStart.getDate()}/${wStart.getMonth() + 1}`
        weekRanges.push({
          from: ymd(wStart.getFullYear(), wStart.getMonth(), wStart.getDate()),
          to: ymd(wEnd.getFullYear(), wEnd.getMonth(), wEnd.getDate()),
          label,
        })
      }
      cur.setDate(cur.getDate() + 7)
    }

    const isIuran = (t: Tx) =>
      t.category === "Iuran" ||
      t.category === "Iuran harian" ||
      t.category === "Iuran khusus"

    /**
     * Cocokkan transaksi ke 1 siswa.
     * - Individual: description = nama (atau "nama · …")
     * - Batch "… · N siswa · …": hanya bila nama ada di daftar; share = amount/N
     * - Jangan pakai includes() longgar di batch (bikin semua dpt slot penuh)
     */
    const matchPay = (
      t: Tx,
      name: string,
    ): { self: boolean; batch: boolean; share: number } => {
      const d = t.description.toLowerCase()
      if (d === name || d.startsWith(name + " ·")) {
        return { self: true, batch: false, share: t.amount }
      }
      const bm = d.match(BATCH_RE)
      if (bm) {
        const n = Math.max(1, parseInt(bm[1], 10) || 1)
        // Nama harus muncul setelah penanda batch
        const marker = d.search(BATCH_RE)
        const listPart = marker >= 0 ? d.slice(marker) : d
        if (listPart.includes(name)) {
          return {
            self: false,
            batch: true,
            share: Math.max(1, Math.round(t.amount / n)),
          }
        }
        return { self: false, batch: false, share: 0 }
      }
      if (d.includes(name)) {
        return { self: true, batch: false, share: t.amount }
      }
      return { self: false, batch: false, share: 0 }
    }

    const inc = (rows ?? []).filter((t) => t.kind === "IN" && isIuran(t))
    const ymPrefix = `${year}-${String(month + 1).padStart(2, "0")}`

    const rowsOut = (students ?? []).map((s) => {
      const name = s.full_name.toLowerCase()
      const perWeek = weekRanges.map(() => 0)

      // Semua bayar (untuk lunas) + yang jatuh di bulan ini (untuk sel)
      let totalPaid = 0
      let specialSlots = 0

      for (const t of inc) {
        const m = matchPay(t, name)
        if (m.share <= 0) continue
        totalPaid += m.share

        const inMonth = t.occurred_on.startsWith(ymPrefix)
        const wi = weekRanges.findIndex(
          ({ from, to }) => t.occurred_on >= from && t.occurred_on <= to,
        )
        const isSpecial =
          !m.batch &&
          (t.category === "Iuran khusus" || t.amount > NOMINAL)

        if (isSpecial) {
          // Slot Bayar Khusus hanya dari transaksi bulan ini
          if (inMonth) {
            specialSlots += Math.max(1, Math.round(t.amount / NOMINAL))
            if (wi >= 0) perWeek[wi] = Math.min(2, Math.max(perWeek[wi], 1))
          }
        } else if (wi >= 0) {
          // Setoran harian / batch: hitung 1× di minggu asal (bukan full amount)
          perWeek[wi] = Math.min(2, perWeek[wi] + 1)
        }
      }

      // Isi slot Bayar Khusus bulan ini dari awal — hanya ke minggu < 2
      let slots = specialSlots
      while (slots > 0) {
        let target = -1
        for (let i = 0; i < perWeek.length; i++) {
          if (perWeek[i] < 2 && (target < 0 || perWeek[i] < perWeek[target])) {
            target = i
          }
        }
        if (target < 0) break
        perWeek[target] += 1
        slots -= 1
      }

      const totalSlots = Math.round(totalPaid / NOMINAL)
      return {
        id: s.id,
        name: formatDisplayName(s.full_name),
        perWeek,
        totalSlots,
        lunas: totalSlots >= LUNAS_SLOTS,
      }
    })

    return {
      weeks: weekRanges.map((w, i) => ({ id: i, label: w.label })),
      rows: rowsOut,
      monthLabel: `${MONTHS_ID[month]} ${year}`,
      weekCount: weekRanges.length,
      lunasTarget: LUNAS_SLOTS,
    }
  }, [rows, students, dateMonth])

  const allWithSaldo: LedgerRow[] = useMemo(() => {
    const sorted = [...(rows ?? [])].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
    let run = 0
    return sorted.map((t) => {
      run += t.kind === "IN" ? t.amount : -t.amount
      return { ...t, saldo: run }
    })
  }, [rows])

  const display = useMemo(
    () =>
      allWithSaldo.filter((t) => {
        if (only !== "all" && t.kind !== only) return false
        if (dateMonth && !t.occurred_on.startsWith(dateMonth)) return false
        return true
      }),
    [allWithSaldo, only, dateMonth],
  )

  type LedgerLine = {
    key: string
    day: string
    uraian: string
    masuk: number
    keluar: number
    detail?: Tx
    count?: number
    empty?: boolean
  }

  const ledgerLines = useMemo(() => {
    const totalSiswa = students?.length ?? 0
    const byDay = new Map<string, Tx[]>()
    for (const t of display) {
      const list = byDay.get(t.occurred_on) ?? []
      list.push(t)
      byDay.set(t.occurred_on, list)
    }

    // Opsi A: hanya hari yang benar-benar ada transaksi
    const days = [...byDay.keys()].sort()

    const lines: LedgerLine[] = []
    for (const day of days) {
      const items = byDay.get(day) ?? []
      const tanggal = formatDateID(new Date(day + "T12:00:00"))

      const iuran = items.filter((t) => {
        if (t.kind !== "IN") return false
        return (
          t.category === "Iuran" ||
          t.category === "Iuran harian" ||
          t.category === "Iuran khusus"
        )
      })
      if (iuran.length > 0) {
        const sum = iuran.reduce((s, t) => s + t.amount, 0)
        const nameSet = new Set<string>()
        const roster = new Set(
          (students ?? []).map((s) => s.full_name.toLowerCase()),
        )
        for (const t of iuran) {
          const d = t.description.trim().toLowerCase()
          if (roster.has(d)) nameSet.add(d)
          else if (/·\s*\d+\s*siswa\b/i.test(d)) continue
          else {
            for (const n of roster) {
              if (d === n || d.startsWith(n + " ·") || d.includes(n)) {
                nameSet.add(n)
                break
              }
            }
          }
        }
        const paidCount = nameSet.size > 0 ? nameSet.size : iuran.length
        const label =
          totalSiswa > 0 ? t("kas.studentsCount", { paid: paidCount, total: totalSiswa }) : t("kas.studentsCountLabel", { n: paidCount })
        lines.push({
          key: `iuran-${day}`,
          day,
          uraian: label,
          masuk: sum,
          keluar: 0,
          detail: iuran[iuran.length - 1],
          count: paidCount,
        })
      }

      const others = items.filter((t) => !iuran.includes(t))
      for (const t of others) {
        lines.push({
          key: t.id,
          day,
          uraian: shortUraian(t),
          masuk: t.kind === "IN" ? t.amount : 0,
          keluar: t.kind === "OUT" ? t.amount : 0,
          detail: t,
        })
      }
    }
    return lines
  }, [display, students, dateMonth])

  const totalIn = display.filter((t) => t.kind === "IN").reduce((s, t) => s + t.amount, 0)
  const totalOut = display.filter((t) => t.kind === "OUT").reduce((s, t) => s + t.amount, 0)
  const hasFilter = Boolean(date || only !== "all")

  return (
    <div className="min-h-full bg-page">
      {/* Header ringkas */}
      <div className="sticky top-0 z-10 bg-white border-b border-line px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 mb-3">
          <Link
            href="/app/kas"
            aria-label={t("common.back")}
            className="flex items-center justify-center text-ink shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex-1 text-lg font-bold text-ink leading-tight">{t("kas.book")}</h1>
          <div className="relative flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                if (!calOpen && calBtnRef.current) {
                  const rect = calBtnRef.current.getBoundingClientRect()
                  setCalTop(rect.bottom + 4)
                }
                setCalOpen((v) => !v)
              }}
              aria-label={t("kas.pickDate")}
              className={`flex items-center justify-center h-8 w-8 rounded-lg border bg-page ${
                calOpen ? "border-forest" : "border-line"
              }`}
            >
              <CalendarDays className="h-4 w-4 text-forest" />
            </button>
            <div
              className={`flex items-center h-8 rounded-lg border text-xs font-medium text-ink ${
                calOpen ? "border-forest" : "border-line"
              }`}
            >
              <button
                type="button"
                onClick={() => shiftMonth(-1)}
                aria-label={t("kas.prevMonth")}
                className="h-full px-1.5 text-ink-soft active:text-forest"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="w-[76px] text-center truncate">
                {date
                  ? MONTHS_ID[parseInt(date.slice(5, 7), 10) - 1]
                  : t("kas.month")}
              </span>
              <button
                type="button"
                onClick={() => shiftMonth(1)}
                aria-label={t("kas.nextMonth")}
                className="h-full px-1.5 text-ink-soft active:text-forest"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            {calOpen && (
              <MiniCalendar
                selected={date}
                dayMarks={dayMarks}
                onSelect={setDate}
                onClose={() => setCalOpen(false)}
                top={calTop}
              />
            )}
          </div>
        </div>

        {/* Tab: ledger vs per siswa vs matriks */}
        <div className="grid grid-cols-3 gap-1 bg-surface rounded-lg p-0.5 mb-3">
            {(
              [
                ["matriks", t("kas.tabMatrix")],
                ["siswa", t("kas.tabPerStudent")],
                ["ledger", t("kas.tabLedger")],
              ] as const
            ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setView(k)}
              className={`py-1.5 rounded-md text-xs font-semibold transition ${
                view === k ? "bg-white text-forest shadow-sm" : "text-ink-soft"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Baris: filter + reset + total — card seragam (ledger) */}
        {view === "ledger" && (
          <div className="bg-white border border-line shadow-sm rounded-xl px-3 py-3 mb-0">
            <div className="flex items-center gap-1.5">
              {(
                [
                  ["all", t("common.all")],
                  ["IN", t("home.in")],
                  ["OUT", t("home.out")],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setOnly(k)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${
                    only === k
                      ? "bg-forest text-white border-forest"
                      : "bg-white text-ink-soft border-line"
                  }`}
                >
                  {label}
                </button>
              ))}
              {hasFilter && (
                <>
                  <span className="text-ink-soft/25 text-xs font-medium shrink-0">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setDate("")
                      setOnly("all")
                    }}
                    className="text-xs font-semibold text-forest shrink-0"
                  >
                    {t("kas.reset")}
                  </button>
                </>
              )}

              <div className="ml-auto flex items-center gap-2.5 shrink-0">
                <span className="flex items-center gap-0.5 text-xs font-semibold text-forest tabular-nums">
                  <ArrowUpRight className="h-3 w-3" />
                  {rp(totalIn)}
                </span>
                <span className="flex items-center gap-0.5 text-xs font-semibold text-alert tabular-nums">
                  <ArrowDownRight className="h-3 w-3" />
                  {rp(totalOut)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Filter periode — Per Siswa, card seragam (ledger) */}
        {view === "siswa" && (
          <div className="bg-white border border-line shadow-sm rounded-xl px-3 py-3 mb-0">
            <div className="flex items-center gap-1.5">
              {(
                [
                  ["week", t("kas.thisWeek")],
                  ["month", t("kas.thisMonth")],
                  ["all", t("common.all")],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setPeriod(k)}
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full border shrink-0 ${
                    period === k
                      ? "bg-forest text-white border-forest"
                      : "bg-white text-ink-soft border-line"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-3 pb-4 pt-2">
        {view === "matriks" ? (
          <div className="bg-white border border-line shadow-sm rounded-xl overflow-hidden">
            <div className="px-3 pt-2.5 pb-2 bg-forest text-white">
              <p className="text-xs font-medium text-white/90">
                {t("kas.matrixTitle", { month: matriks.monthLabel })}
              </p>
              <p className="text-[11px] text-white/50 mt-0.5">
                {t("kas.matrixWeeks", { n: matriks.weekCount })} · {t("kas.lunasHint", { amount: formatIDR(matriks.lunasTarget * 1000) })}
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-[11px]">
                <thead>
                  <tr className="bg-page/80 border-b border-line text-ink-soft/60 font-medium">
                    <th className="px-1.5 py-1.5 text-center sticky left-0 bg-page/80 z-10 w-7 min-w-[28px] whitespace-nowrap overflow-hidden">
                      {t("kas.colNo")}
                    </th>
                    <th className="px-2 py-1.5 text-left sticky left-7 bg-page/80 z-10 whitespace-nowrap overflow-hidden">
                      {t("kas.colName")}
                    </th>
                    {matriks.weeks.map((w) => (
                      <th key={w.id} className="px-0 py-1.5 text-center tabular-nums w-9 min-w-[32px] whitespace-nowrap overflow-hidden">
                        {w.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matriks.rows.map((s, i) => (
                    <tr key={s.id} className="border-b border-line/40">
                      <td className="px-1.5 py-1.5 text-center sticky left-0 bg-white z-10 w-7 min-w-[28px] text-[11px] text-ink-soft/50 tabular-nums whitespace-nowrap overflow-hidden">
                        {i + 1}
                      </td>
                      <td className="px-2 py-1.5 sticky left-7 bg-white z-10 overflow-hidden">
                        <span
                          className={`block text-xs whitespace-nowrap overflow-hidden text-ellipsis ${s.lunas ? "font-semibold text-forest" : "font-medium text-ink"}`}
                        >
                          {s.name}
                        </span>
                      </td>
                      {s.perWeek.map((c, wi) => {
                        // Sel 0 / 1 / 2 (target 2×/minggu) — angka polos, warna sebagai penanda
                        const n = Math.min(2, Math.max(0, c))
                        const cls =
                          n >= 2
                            ? "text-forest"
                            : n === 1
                              ? "text-amber-600"
                              : "text-alert/45"
                        return (
                          <td key={wi} className="px-0 py-1.5 text-center tabular-nums w-9 min-w-[32px] whitespace-nowrap overflow-hidden">
                            <span className={`text-[11px] ${cls}`}>{n > 0 ? n : "–"}</span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {matriks.rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={2 + matriks.weekCount}
                        className="p-5 text-center text-xs text-ink-soft/45"
                      >
                        {t("kas.noStudentData")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 bg-page/60 border-t border-line text-[11px] text-ink-soft/50 font-medium">
              {t("kas.matrixLegend")}
            </div>
          </div>
        ) : view === "siswa" ? (
          <div className="bg-white border border-line shadow-sm rounded-xl overflow-hidden">
            <div className="px-3 pt-2.5 pb-2 bg-forest text-white">
              <p className="text-xs font-medium text-white/90">{t("kas.perStudentTitle")}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-[11px]">
                <thead>
                  <tr className="bg-page border-b border-line text-ink-soft/60 font-semibold">
                    <th className="px-1 py-1.5 text-center w-6 whitespace-nowrap overflow-hidden">{t("kas.colNo")}</th>
                    <th className="px-1.5 py-1.5 text-left w-[38%] whitespace-nowrap overflow-hidden">{t("kas.colName")}</th>
                    <th className="px-1 py-1.5 text-center w-[14%] border-r border-line/50 whitespace-nowrap overflow-hidden">{t("kas.timesCol")}</th>
                    <th className="px-1 py-1.5 text-right w-[24%] border-r border-line/50 whitespace-nowrap overflow-hidden">{t("kas.totalCol")}</th>
                    <th className="px-1.5 py-1.5 text-right w-[18%] whitespace-nowrap overflow-hidden">{t("kas.lastCol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {perSiswa.map((s, i) => {
                    const level = payLevel(s.times)
                    return (
                      <tr key={s.id} className={`border-b border-line/60 last:border-b-0 ${level.bg}`}>
                        <td className="px-1 py-1.5 text-center text-[11px] text-ink-soft/40 tabular-nums whitespace-nowrap overflow-hidden">
                          {i + 1}
                        </td>
                        <td className="px-1.5 py-1.5 border-r border-line/40 overflow-hidden">
                          <span className="block text-xs font-medium text-ink whitespace-nowrap overflow-hidden text-ellipsis">
                            {s.name}
                          </span>
                        </td>
                        <td className={`px-1 py-1.5 text-center text-[11px] font-medium tabular-nums border-r border-line/40 whitespace-nowrap overflow-hidden ${level.cls}`}>
                          {s.times}x
                        </td>
                        <td className={`px-1 py-1.5 text-right text-[11px] font-medium tabular-nums border-r border-line/40 whitespace-nowrap overflow-hidden text-ellipsis ${level.cls}`}>
                          {s.total ? rp(s.total) : "—"}
                        </td>
                        <td className="px-1.5 py-1.5 text-right text-[11px] text-ink-soft/50 tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
                          {dmy(s.last)}
                        </td>
                      </tr>
                    )
                  })}
                  {perSiswa.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-5 text-center text-xs text-ink-soft/45 whitespace-nowrap">
                        Belum ada data siswa
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 bg-page/60 border-t border-line text-[11px] text-ink-soft/50 font-medium">
              {t("kas.levelHint")}
            </div>
          </div>
        ) : (
          <div className="bg-white border border-line shadow-sm rounded-xl overflow-hidden">
            <div className="px-3 pt-2.5 pb-2 bg-forest text-white">
              <p className="text-xs font-medium text-white/90">{t("kas.tabLedger")}</p>
              <p className="text-[11px] text-white/50 mt-0.5 truncate">
                {dateMonth
                  ? `${MONTHS_ID[parseInt(dateMonth.slice(5, 7), 10) - 1]} ${dateMonth.slice(0, 4)}`
                  : t("common.all")}{" "}
                · {rp(totalIn)} · {rp(totalOut)}
              </p>
            </div>
            {error ? (
              <EmptyState icon={<Inbox className="h-6 w-6" />} message={t("kas.bookError")} />
            ) : ledgerLines.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-6 w-6" />}
                message={hasFilter ? t("kas.noFilterData") : t("kas.noTransactions")}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-fixed border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-page border-b border-line text-ink-soft/60 font-semibold">
                      <th className="px-0.5 py-1.5 text-center w-[7%] border-r border-line/50 whitespace-nowrap overflow-hidden">{t("kas.colNo")}</th>
                      <th className="px-1 py-1.5 text-left w-[21%] border-r border-line/50 whitespace-nowrap overflow-hidden">{t("kas.dateCol")}</th>
                      <th className="px-1 py-1.5 text-left w-[34%] border-r border-line/50 whitespace-nowrap overflow-hidden">{t("kas.descCol")}</th>
                      <th className="px-0.5 py-1.5 text-center w-[19%] border-r border-line/50 whitespace-nowrap overflow-hidden">{t("home.in")}</th>
                      <th className="px-0.5 py-1.5 text-center w-[19%] whitespace-nowrap overflow-hidden">{t("home.out")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerLines.map((line, i) => (
                      <tr
                        key={line.key}
                        onClick={() => line.detail && void openDetail(line.detail)}
                        className={`border-b border-line/60 last:border-b-0 ${line.detail ? "cursor-pointer active:bg-page/60" : ""}`}
                      >
                        <td className="px-0.5 py-1.5 text-center text-[11px] text-ink-soft/40 tabular-nums border-r border-line/40 whitespace-nowrap overflow-hidden">
                          {i + 1}
                        </td>
                        <td className="px-1 py-1.5 text-[11px] text-ink-soft/55 tabular-nums border-r border-line/40 whitespace-nowrap overflow-hidden text-ellipsis">
                          {formatDateCompactID(new Date(line.day + "T12:00:00"))}
                        </td>
                        <td className="px-1 py-1.5 border-r border-line/40 whitespace-nowrap overflow-hidden">
                          <span className="block text-xs font-medium text-ink whitespace-nowrap overflow-hidden text-ellipsis">
                            {line.uraian}
                          </span>
                        </td>
                        <td
                          className={`px-0.5 py-1.5 text-right text-[11px] font-medium tabular-nums border-r border-line/40 whitespace-nowrap overflow-hidden text-ellipsis ${
                            line.masuk ? "text-forest" : "text-ink-soft/20"
                          }`}
                        >
                          {line.masuk ? rp(line.masuk) : "—"}
                        </td>
                        <td
                          className={`px-0.5 py-1.5 text-right text-[11px] font-medium tabular-nums whitespace-nowrap overflow-hidden text-ellipsis ${
                            line.keluar ? "text-alert" : "text-ink-soft/20"
                          }`}
                        >
                          {line.keluar ? rp(line.keluar) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-page border-t border-line">
                      <td colSpan={2} className="px-1 py-1.5 border-r border-line/50" />
                      <td className="px-1 py-1.5 text-[11px] font-bold text-ink border-r border-line/50 whitespace-nowrap overflow-hidden text-ellipsis">
                        {t("kas.totalRow")}
                      </td>
                      <td className="px-0.5 py-1.5 text-right text-[11px] font-bold text-forest tabular-nums border-r border-line/50 whitespace-nowrap overflow-hidden text-ellipsis">
                        {rp(totalIn)}
                      </td>
                      <td className="px-0.5 py-1.5 text-right text-[11px] font-bold text-alert tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
                        {rp(totalOut)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={() => void mutate()}
          className="mt-2 w-full text-xs font-semibold text-ink-soft py-1.5"
        >
          {t("kas.reload")}
        </button>
      </div>

      {/* Detail full-screen */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-page flex flex-col">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-white border-b border-line">
            <button
              type="button"
              onClick={() => setDetail(null)}
              aria-label={t("kas.closeDetail")}
              className="flex items-center justify-center text-ink"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-lg font-bold text-ink flex-1">{t("kas.txDetailTitle")}</h2>
            <span
              className={`text-xs font-bold px-2 py-1 rounded-full ${
                detail.kind === "IN"
                  ? "bg-ok-bg text-forest"
                  : "bg-alert-bg text-alert"
              }`}
            >
              {detail.kind === "IN" ? t("kas.inUpper") : t("kas.outUpper")}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {/* Nominal besar */}
            <div
              className={`rounded-2xl p-4 text-center ${
                detail.kind === "IN" ? "bg-forest text-white" : "bg-alert text-white"
              }`}
            >
              <p className="text-xs font-medium opacity-80">
                {detail.kind === "IN" ? t("kas.income") : t("kas.expense")}
              </p>
              <p className="mt-1 text-3xl font-black tabular-nums">
                {rp(detail.amount)}
              </p>
            </div>

            {/* Tabel field */}
            <div className="bg-white border border-line shadow-sm rounded-2xl overflow-hidden">
              <div className="divide-y divide-line/60">
                {[
                  [t("kas.descCol"), shortUraian(detail)],
                  [t("kas.categoryCol"), detail.category || "—"],
                  [t("kas.eventDate"), fullDate(detail.occurred_on)],
                  [t("kas.recordedTime"), formatTimeID(new Date(detail.created_at))],
                  [t("kas.recordedBy"), detail.recorded_by || "—"],
                  [t("kas.txId"), detail.id],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-3 px-3.5 py-3"
                  >
                    <span className="text-xs text-ink-soft shrink-0">{label}</span>
                    <span className="text-sm font-semibold text-ink text-right min-w-0 break-words">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Credit bar */}
            <div className="flex items-center gap-2 text-xs text-ink-soft/60 px-1">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {t("kas.lastRecorded")} <strong className="text-ink font-semibold">{detail.recorded_by || "—"}</strong>
              </span>
              <Clock className="h-3 w-3 shrink-0 ml-1" />
              <span className="shrink-0">
                {fullDate(detail.created_at)} ·{" "}
                {formatTimeID(new Date(detail.created_at))}
              </span>
            </div>

            {/* Status siswa per hari — hanya untuk iuran */}
            {isIuranTx(detail) && (
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-ink">
                  {t("kas.dayStatus", { date: fullDate(detail.occurred_on) })}
                </h3>
                {dayStatusLoading ? (
                  <p className="text-xs text-ink-soft/50">{t("kas.loadingStatus")}</p>
                ) : dayStatus ? (
                  <>
                      {(
                        [
                          [t("kas.pay"), dayStatus.bayar, "bg-forest text-white", "text-forest"],
                          [t("kas.leave"), dayStatus.izin, "bg-amber text-white", "text-amber"],
                          [t("kas.overdue"), dayStatus.nunggak, "bg-alert text-white", "text-alert"],
                        ] as const
                      ).map(([label, names, chip, textCls]) => (
                      <div
                        key={label}
                        className="bg-white border border-line shadow-sm rounded-2xl overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-3 py-2 bg-page/60 border-b border-line">
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${chip}`}>
                            {label}
                          </span>
                          <span className="text-xs text-ink-soft/60 tabular-nums">
                            {t("kas.studentsCountLabel", { n: names.length })}
                          </span>
                        </div>
                        {names.length === 0 ? (
                          <p className={`px-3 py-2.5 text-xs ${textCls} opacity-70`}>
                            {t("kas.none")}
                          </p>
                        ) : (
                          <div className="divide-y divide-line/40">
                            {names.map((n, i) => (
                              <div
                                key={n}
                                className="flex items-center gap-2 px-3 py-2"
                              >
                                <span className="w-5 text-center text-[11px] text-ink-soft/40 tabular-nums shrink-0">
                                  {i + 1}
                                </span>
                                <span className="text-xs font-medium text-ink truncate flex-1">
                                  {n}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <p className="text-[11px] text-ink-soft/50 leading-relaxed px-0.5">
                      {t("kas.leaveNote")}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-ink-soft/50">{t("kas.statusLoadFailed")}</p>
                )}
              </div>
            )}
          </div>

          <div
            className="px-4 pt-2 bg-white border-t border-line"
            style={{
              paddingBottom:
                "calc(1rem + var(--sevenbro-nav-bar-inset, 0px) + var(--sevenbro-safe-bottom, env(safe-area-inset-bottom, 0px)))",
            }}
          >
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="w-full bg-forest text-white text-sm font-bold py-3 rounded-xl"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
