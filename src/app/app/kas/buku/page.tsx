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
import { formatIDR, formatTimeID, formatDisplayName } from "@/lib/format"
import { RoleGate } from "@/components/RoleGate"
import { useT } from "@/lib/i18n"
import { VerifiedBadge } from "@/components/VerifiedBadge"

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

const BATCH_RE = /·\s*(\d+)\s*siswa\b/i

type StudentPay = { tx: Tx; share: number }

/** Baris bulk-plot backlog 22 Sep (fix-kas-backlog): bukan catatan bayar harian. */
const BACKLOG_PLOT_AT = "2026-09-22T10:05:47"

/**
 * Riwayat bayar siswa untuk menu Per Siswa.
 * Hanya catatan bayar yang dicatat pada tanggal bayarnya —
 * slot yang diplot ke hari lain (backlog / bayar di muka) urusan Matriks.
 * monthKey "YYYY-MM" → filter ke bulan di month selector.
 */
function paymentsForStudent(rows: Tx[], fullName: string, monthKey?: string): StudentPay[] {
  const name = fullName.trim().toLowerCase()
  if (!name) return []
  const now = new Date()
  const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const out: StudentPay[] = []
  for (const t of rows) {
    if (t.kind !== "IN") continue
    if (t.occurred_on > todayYmd) continue
    if ((t.created_at || "").startsWith(BACKLOG_PLOT_AT)) continue
    if (monthKey && !t.occurred_on.startsWith(monthKey)) continue
    const d = (t.description || "").toLowerCase()
    if (d === name || d.startsWith(name + " ·")) {
      out.push({ tx: t, share: t.amount })
      continue
    }
    const bm = d.match(BATCH_RE)
    if (bm) {
      const n = Math.max(1, parseInt(bm[1], 10) || 1)
      const marker = d.search(BATCH_RE)
      const listPart = marker >= 0 ? d.slice(marker) : d
      if (listPart.includes(name)) {
        out.push({ tx: t, share: Math.max(1, Math.round(t.amount / n)) })
      }
      continue
    }
    if (d.includes(name)) out.push({ tx: t, share: t.amount })
  }
  return out.sort((a, b) => sortKey(b.tx).localeCompare(sortKey(a.tx)))
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
  const { data: rows, error } = useAppSWR<Tx[]>(
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
  const [historyStudent, setHistoryStudent] = useState<{
    id: string
    name: string
    nameKey: string
    position: string
  } | null>(null)
  // Quick view: dropdown biasa → detail di tabel bawah (bukan modal)
  const [quickViewId, setQuickViewId] = useState("")
  const { data: students } = useAppSWR<
    { id: string; full_name: string; position: string }[]
  >("/api/admin/students", undefined, { refreshInterval: 60000 })

  const dayMarks = useMemo(() => buildDayMarks(rows ?? []), [rows])

  // Filter tanggal → per BULAN (bukan per hari saja)
  const dateMonth = date ? date.slice(0, 7) : ""
  const currentYm = useMemo(() => {
    const n = new Date()
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`
  }, [])
  // Bulan efektif: pilihan user, default bulan berjalan
  const displayMonth = dateMonth || currentYm
  const monthLabel = MONTHS_ID[parseInt(displayMonth.slice(5, 7), 10) - 1] ?? ""

  // Navigasi bulan cepat via panah ‹ › (tanpa buka kalender)
  const shiftMonth = (delta: number) => {
    const base = dateMonth || currentYm
    const [y, m] = base.split("-").map(Number)
    const d = new Date(y, m - 1 + delta, 1)
    setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`)
  }

  // Rekap per siswa — ikut month selector
  const perSiswa = useMemo(() => {
    return (students ?? []).map((s) => {
      const pays = paymentsForStudent(rows ?? [], s.full_name, displayMonth)
      const total = pays.reduce((sum, p) => sum + p.share, 0)
      const last = pays.map((p) => p.tx.occurred_on).sort().at(-1)
      return {
        id: s.id,
        name: formatDisplayName(s.full_name),
        nameKey: s.full_name,
        position: s.position,
        times: pays.length,
        total,
        last,
      }
    }).sort((a, b) => {
      // Terbaru di atas; yang belum bayar di bawah
      const la = a.last ?? ""
      const lb = b.last ?? ""
      if (la !== lb) return lb.localeCompare(la)
      return a.name.localeCompare(b.name)
    })
  }, [rows, students, displayMonth])

  // Matriks: plot total bayar berurutan dari mulai kas (4 Agu 2026) ke hari setoran Sel/Kam.
  // Surplus (bayar di muka) otomatis lanjut ke minggu/bulan berikutnya — bukan ke occurred_on.
  const matriks = useMemo(() => {
    const NOMINAL = 1000
    const TERM_START = "2026-08-04"
    const now0 = new Date()
    const todayStr0 = ymd(now0.getFullYear(), now0.getMonth(), now0.getDate())

    // Daftar hari setoran (Sel/Kam) dari anchor sampai cukup jauh ke depan
    const collectionDays: string[] = []
    for (
      let d = new Date(TERM_START + "T12:00:00");
      collectionDays.length < 120;
      d.setDate(d.getDate() + 1)
    ) {
      const dow = d.getDay()
      if (dow === 2 || dow === 4) {
        collectionDays.push(ymd(d.getFullYear(), d.getMonth(), d.getDate()))
      }
    }
    // Lunas = slot yang jatuh tempo s.d. hari ini
    const LUNAS_SLOTS = collectionDays.filter((d) => d <= todayStr0).length

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
      // buang minggu sebelum mulai kas (mis. 27/7 — tidak ada korelasi)
      if (wEnd >= monthStart && wStart <= monthEnd && wEnd >= new Date(TERM_START + "T12:00:00")) {
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

    const rowsOut = (students ?? []).map((s) => {
      const name = s.full_name.toLowerCase()
      const perWeek = weekRanges.map(() => 0)

      // Total bayar sepanjang waktu (semua baris iuran, termasuk backlog plot)
      let totalPaid = 0
      for (const t of inc) {
        const m = matchPay(t, name)
        if (m.share > 0) totalPaid += m.share
      }

      // Plot berurutan: slot 1..N ke hari setoran dari 4 Agu
      // (N = totalPaid / 1000). Surplus otomatis lanjut ke bulan depan.
      const totalSlots = Math.round(totalPaid / NOMINAL)
      for (let i = 0; i < totalSlots && i < collectionDays.length; i++) {
        const day = collectionDays[i]
        const wi = weekRanges.findIndex(({ from, to }) => day >= from && day <= to)
        if (wi >= 0) {
          perWeek[wi] = Math.min(2, perWeek[wi] + 1)
        }
      }

      return {
        id: s.id,
        name: formatDisplayName(s.full_name),
        position: s.position,
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

  // Jurnal kas: 1 baris = 1 transaksi nyata (bukan agregat harian / slot plot)
  const journalRows = useMemo(() => {
    const sorted = [...(rows ?? [])]
      .filter((t) => !(t.created_at || "").startsWith(BACKLOG_PLOT_AT))
      .sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
    let run = 0
    const withSaldo: LedgerRow[] = sorted.map((t) => {
      run += t.kind === "IN" ? t.amount : -t.amount
      return { ...t, saldo: run }
    })
    return withSaldo.filter((t) => {
      if (only !== "all" && t.kind !== only) return false
      if (!t.occurred_on.startsWith(displayMonth)) return false
      return true
    })
  }, [rows, only, displayMonth])

  const totalIn = journalRows.filter((t) => t.kind === "IN").reduce((s, t) => s + t.amount, 0)
  const totalOut = journalRows.filter((t) => t.kind === "OUT").reduce((s, t) => s + t.amount, 0)
  const lastSaldo = journalRows.at(-1)?.saldo ?? 0
  const hasFilter = Boolean(only !== "all")

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
                {monthLabel}
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

        {/* Filter Per Siswa: Semua + dropdown nama (quick view di tabel bawah) */}
        {view === "siswa" && (
          <div className="bg-white border border-line shadow-sm rounded-xl px-3 py-3 mb-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuickViewId("")}
                className={`text-xs font-semibold px-2.5 py-1.5 rounded-full border shrink-0 ${
                  !quickViewId
                    ? "bg-forest text-white border-forest"
                    : "bg-white text-ink-soft border-line"
                }`}
              >
                {t("common.all")}
              </button>
              <select
                value={quickViewId}
                onChange={(e) => setQuickViewId(e.target.value)}
                aria-label={t("kas.quickViewStudent")}
                className="flex-1 min-w-0 h-9 rounded-lg border border-line bg-white px-2.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-forest/30"
              >
                <option value="">{t("kas.quickViewStudent")}</option>
                {(students ?? [])
                  .slice()
                  .sort((a, b) => a.full_name.localeCompare(b.full_name))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatDisplayName(s.full_name)}
                    </option>
                  ))}
              </select>
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
                          <VerifiedBadge position={s.position} className="ml-0.5 h-3 w-3" />
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
          (() => {
            const q = quickViewId
              ? (students ?? []).find((s) => s.id === quickViewId)
              : null
            if (q) {
              const pays = paymentsForStudent(rows ?? [], q.full_name, displayMonth)
              const total = pays.reduce((sum, p) => sum + p.share, 0)
              return (
                <div className="bg-white border border-line shadow-sm rounded-xl overflow-hidden">
                  <div className="px-3 pt-2.5 pb-2 bg-forest text-white">
                    <p className="text-xs font-medium text-white/90">
                      {t("kas.paymentHistory")}
                    </p>
                    <p className="text-[11px] text-white/70 truncate">
                      {formatDisplayName(q.full_name)} · {pays.length}x · {rp(total)}
                    </p>
                  </div>
                  {pays.length === 0 ? (
                    <div className="p-5 text-center text-xs text-ink-soft/45">
                      {t("kas.noPaymentHistory")}
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed border-collapse text-[11px]">
                        <thead>
                          <tr className="bg-page border-b border-line text-ink-soft/60 font-semibold">
                            <th className="px-1 py-1.5 text-center w-8 whitespace-nowrap overflow-hidden">{t("kas.colNo")}</th>
                            <th className="px-1.5 py-1.5 text-left w-[28%] whitespace-nowrap overflow-hidden">{t("kas.dateCol")}</th>
                            <th className="px-1 py-1.5 text-center w-[14%] border-r border-line/50 whitespace-nowrap overflow-hidden">{t("kas.timeCol")}</th>
                            <th className="px-1.5 py-1.5 text-left border-r border-line/50 whitespace-nowrap overflow-hidden">{t("kas.descCol")}</th>
                            <th className="px-1.5 py-1.5 text-right w-[22%] whitespace-nowrap overflow-hidden">{t("kas.totalCol")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pays.map((p, i) => (
                            <tr key={p.tx.id} className="border-b border-line/60 last:border-b-0">
                              <td className="px-1 py-1.5 text-center text-[11px] text-ink-soft/40 tabular-nums whitespace-nowrap overflow-hidden">
                                {i + 1}
                              </td>
                              <td className="px-1.5 py-1.5 text-[11px] text-ink-soft/70 tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
                                {dmy(p.tx.occurred_on)} {p.tx.occurred_on.slice(0, 4)}
                              </td>
                              <td className="px-1 py-1.5 text-center text-[11px] text-ink-soft/70 tabular-nums border-r border-line/40 whitespace-nowrap overflow-hidden">
                                {p.tx.created_at.slice(0, 10) === p.tx.occurred_on
                                  ? formatTimeID(new Date(p.tx.created_at))
                                  : "—"}
                              </td>
                              <td className="px-1.5 py-1.5 border-r border-line/40 overflow-hidden">
                                <span className="block text-xs font-medium text-ink whitespace-nowrap overflow-hidden text-ellipsis">
                                  {p.tx.category || shortUraian(p.tx)}
                                </span>
                              </td>
                              <td className="px-1.5 py-1.5 text-right text-[11px] font-semibold text-forest tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
                                {rp(p.share)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="px-3 py-2 bg-page/60 border-t border-line text-[11px] text-ink-soft/50 font-medium">
                    {t("kas.paymentHistoryHint")}
                  </div>
                </div>
              )
            }
            return (
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
                          <tr
                            key={s.id}
                            onClick={() =>
                              setHistoryStudent({
                                id: s.id,
                                name: s.name,
                                nameKey: s.nameKey,
                                position: s.position,
                              })
                            }
                            className={`border-b border-line/60 last:border-b-0 cursor-pointer active:bg-page/60 ${level.bg}`}
                          >
                            <td className="px-1 py-1.5 text-center text-[11px] text-ink-soft/40 tabular-nums whitespace-nowrap overflow-hidden">
                              {i + 1}
                            </td>
                            <td className="px-1.5 py-1.5 border-r border-line/40 overflow-hidden">
                              <span className="block text-xs font-medium text-ink whitespace-nowrap overflow-hidden text-ellipsis">
                                {s.name}
                                <VerifiedBadge position={s.position} className="ml-0.5 h-3 w-3" />
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
            )
          })()
        ) : (
          <div className="bg-white border border-line shadow-sm rounded-xl overflow-hidden">
            <div className="px-3 pt-2.5 pb-2 bg-forest text-white">
              <p className="text-xs font-medium text-white/90">{t("kas.tabLedger")}</p>
              <p className="text-[11px] text-white/50 mt-0.5 truncate">
                {MONTHS_ID[parseInt(displayMonth.slice(5, 7), 10) - 1]} {displayMonth.slice(0, 4)}
                {" · "}
                {t("kas.journalHint")}
              </p>
            </div>
            {error ? (
              <EmptyState icon={<Inbox className="h-6 w-6" />} message={t("kas.bookError")} />
            ) : journalRows.length === 0 ? (
              <EmptyState
                icon={<BookOpen className="h-6 w-6" />}
                message={hasFilter ? t("kas.noFilterData") : t("kas.noTransactions")}
              />
            ) : (
              (() => {
                // Kelompokkan per hari agar tabel padat dan enak dipindai
                const byDay = new Map<string, LedgerRow[]>()
                for (const row of journalRows) {
                  const list = byDay.get(row.occurred_on) ?? []
                  list.push(row)
                  byDay.set(row.occurred_on, list)
                }
                const days = [...byDay.keys()].sort()
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full table-fixed border-collapse">
                      <thead>
                        <tr className="bg-page border-b border-line text-ink-soft/70 text-[11px] font-semibold">
                          <th className="px-1.5 py-2 text-center w-8 border-r border-line/50">{t("kas.colNo")}</th>
                          <th className="px-1.5 py-2 text-left border-r border-line/50">{t("kas.descCol")}</th>
                          <th className="px-1.5 py-2 text-right w-[28%] border-r border-line/50">{t("kas.amountCol")}</th>
                          <th className="px-1.5 py-2 text-right w-[28%]">{t("kas.saldoCol")}</th>
                        </tr>
                      </thead>
                      {days.map((day) => {
                        const items = byDay.get(day) ?? []
                        const dayIn = items
                          .filter((r) => r.kind === "IN")
                          .reduce((s, r) => s + r.amount, 0)
                        const dayOut = items
                          .filter((r) => r.kind === "OUT")
                          .reduce((s, r) => s + r.amount, 0)
                        return (
                          <tbody key={day} className="last:border-b-0">
                            <tr className="bg-surface/80 border-y border-line/60">
                              <td
                                colSpan={2}
                                className="px-1.5 py-1.5 text-[11px] font-semibold text-ink-soft whitespace-nowrap overflow-hidden text-ellipsis"
                              >
                                {fullDate(day)}
                              </td>
                              <td className="px-1.5 py-1.5 text-right text-[11px] tabular-nums text-forest font-semibold whitespace-nowrap">
                                {dayIn ? rp(dayIn) : ""}
                              </td>
                              <td className="px-1.5 py-1.5 text-right text-[11px] tabular-nums text-alert font-semibold whitespace-nowrap">
                                {dayOut ? rp(dayOut) : ""}
                              </td>
                            </tr>
                            {items.map((line, idx) => {
                              const isIn = line.kind === "IN"
                              return (
                                <tr
                                  key={line.id}
                                  onClick={() => void openDetail(line)}
                                  className="border-b border-line/50 last:border-b-0 cursor-pointer active:bg-page/70"
                                >
                                  <td className="px-1.5 py-2 text-center text-[11px] text-ink-soft/50 tabular-nums border-r border-line/40">
                                    {idx + 1}
                                  </td>
                                  <td className="px-1.5 py-2 border-r border-line/40 overflow-hidden">
                                    <div className="text-xs font-semibold text-ink whitespace-nowrap overflow-hidden text-ellipsis">
                                      {line.description || shortUraian(line)}
                                    </div>
                                    <div className="text-[10px] text-ink-soft/70 truncate">
                                      {line.category}
                                      {line.recorded_by ? ` · ${formatDisplayName(line.recorded_by)}` : ""}
                                    </div>
                                  </td>
                                  <td
                                    className={`px-1.5 py-2 text-right text-xs font-semibold tabular-nums border-r border-line/40 whitespace-nowrap ${
                                      isIn ? "text-forest" : "text-alert"
                                    }`}
                                  >
                                    {isIn ? "" : "−"}
                                    {rp(line.amount)}
                                  </td>
                                  <td className="px-1.5 py-2 text-right text-xs tabular-nums text-ink whitespace-nowrap">
                                    {rp(line.saldo)}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        )
                      })}
                      <tfoot>
                        <tr className="bg-page border-t border-line">
                          <td colSpan={2} className="px-1.5 py-2 text-xs font-bold text-ink">
                            {t("kas.totalRow")}
                          </td>
                          <td className="px-1.5 py-2 text-right text-xs font-bold tabular-nums whitespace-nowrap">
                            <span className="text-forest">{rp(totalIn)}</span>
                            {totalOut > 0 && <span className="text-alert"> · {rp(totalOut)}</span>}
                          </td>
                          <td className="px-1.5 py-2 text-right text-xs font-bold tabular-nums text-ink whitespace-nowrap">
                            {rp(lastSaldo)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )
              })()
            )}
          </div>
        )}
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

      {/* Riwayat bayar siswa — full screen */}
      {historyStudent && (
        <div className="fixed inset-0 z-50 bg-page flex flex-col">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-white border-b border-line">
            <button
              type="button"
              onClick={() => setHistoryStudent(null)}
              aria-label={t("kas.closeDetail")}
              className="flex items-center justify-center text-ink"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-ink truncate">{t("kas.paymentHistory")}</h2>
              <p className="text-xs text-ink-soft truncate">
                {historyStudent.name}
                <VerifiedBadge position={historyStudent.position} className="ml-0.5 h-3 w-3 inline-block align-middle" />
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {(() => {
              const pays = paymentsForStudent(rows ?? [], historyStudent.nameKey, displayMonth)
              const total = pays.reduce((sum, p) => sum + p.share, 0)
              return (
                <>
                  <div className="bg-forest text-white rounded-2xl px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-medium opacity-80">{t("kas.timesCol")}</p>
                      <p className="text-xl font-black tabular-nums">{pays.length}x</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium opacity-80">{t("kas.totalCol")}</p>
                      <p className="text-xl font-black tabular-nums">{rp(total)}</p>
                    </div>
                  </div>

                  <div className="bg-white border border-line shadow-sm rounded-xl overflow-hidden">
                    <div className="px-3 pt-2.5 pb-2 bg-forest text-white">
                      <p className="text-xs font-medium text-white/90">{t("kas.paymentHistory")}</p>
                    </div>
                    {pays.length === 0 ? (
                      <div className="p-5 text-center text-xs text-ink-soft/45">
                        {t("kas.noPaymentHistory")}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full table-fixed border-collapse text-[11px]">
                          <thead>
                            <tr className="bg-page border-b border-line text-ink-soft/60 font-semibold">
                              <th className="px-1 py-1.5 text-center w-8 whitespace-nowrap overflow-hidden">{t("kas.colNo")}</th>
                              <th className="px-1.5 py-1.5 text-left w-[28%] whitespace-nowrap overflow-hidden">{t("kas.dateCol")}</th>
                              <th className="px-1 py-1.5 text-center w-[14%] border-r border-line/50 whitespace-nowrap overflow-hidden">{t("kas.timeCol")}</th>
                              <th className="px-1.5 py-1.5 text-left border-r border-line/50 whitespace-nowrap overflow-hidden">{t("kas.descCol")}</th>
                              <th className="px-1.5 py-1.5 text-right w-[22%] whitespace-nowrap overflow-hidden">{t("kas.totalCol")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pays.map((p, i) => (
                              <tr key={p.tx.id} className="border-b border-line/60 last:border-b-0">
                                <td className="px-1 py-1.5 text-center text-[11px] text-ink-soft/40 tabular-nums whitespace-nowrap overflow-hidden">
                                  {i + 1}
                                </td>
                                <td className="px-1.5 py-1.5 text-[11px] text-ink-soft/70 tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
                                  {dmy(p.tx.occurred_on)} {p.tx.occurred_on.slice(0, 4)}
                                </td>
                                <td className="px-1 py-1.5 text-center text-[11px] text-ink-soft/70 tabular-nums border-r border-line/40 whitespace-nowrap overflow-hidden">
                                  {p.tx.created_at.slice(0, 10) === p.tx.occurred_on
                                    ? formatTimeID(new Date(p.tx.created_at))
                                    : "—"}
                                </td>
                                <td className="px-1.5 py-1.5 border-r border-line/40 overflow-hidden">
                                  <span className="block text-xs font-medium text-ink whitespace-nowrap overflow-hidden text-ellipsis">
                                    {p.tx.category || shortUraian(p.tx)}
                                  </span>
                                </td>
                                <td className="px-1.5 py-1.5 text-right text-[11px] font-semibold text-forest tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
                                  {rp(p.share)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="px-3 py-2 bg-page/60 border-t border-line text-[11px] text-ink-soft/50 font-medium">
                      {t("kas.paymentHistoryHint")}
                    </div>
                  </div>
                </>
              )
            })()}
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
              onClick={() => setHistoryStudent(null)}
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
