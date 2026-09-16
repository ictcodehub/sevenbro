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
  Search,
  User,
  X,
} from "lucide-react"
import { EmptyState } from "@/components/ui-primitives"
import { useAppSWR } from "@/lib/fetcher"
import { formatIDR, formatDateID, formatTimeID } from "@/lib/format"
import { RoleGate } from "@/components/RoleGate"

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

const PAGE_ROLES = ["HOMEROOM", "BENDAHARA"]

function sortKey(t: Tx) {
  const time = (t.created_at.split("T")[1] ?? "00:00:00").slice(0, 8)
  return `${t.occurred_on}T${time}`
}

function matchesQuery(t: Tx, q: string) {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const hay = `${t.description} ${t.category} ${t.recorded_by ?? ""}`.toLowerCase()
  return needle
    .split(/\s+/)
    .filter(Boolean)
    .every((part) => hay.includes(part))
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
        aria-label="Tutup kalender"
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
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-[11px] font-semibold text-ink">
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
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {DOW.map((d) => (
            <span
              key={d}
              className="text-center text-[9px] font-medium text-ink-soft/50 py-0.5"
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
                className={`relative h-10 rounded-lg text-[12px] font-medium flex flex-col items-center justify-center transition ${
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

        <div className="mt-2 pt-2 border-t border-line/50 flex items-center gap-4 text-[10px] text-ink-soft/60">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-forest" /> Masuk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-alert" /> Keluar
          </span>
          <button
            type="button"
            onClick={() => {
              onSelect("")
              onClose()
            }}
            className="ml-auto text-forest font-semibold"
          >
            Semua Tanggal
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

  const [q, setQ] = useState("")
  const [only, setOnly] = useState<"all" | "IN" | "OUT">("all")
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
  const [view, setView] = useState<"ledger" | "siswa" | "matriks">("ledger")
  const [period, setPeriod] = useState<"week" | "month" | "all">("month")
  const { data: students } = useAppSWR<
    { id: string; full_name: string; position: string }[]
  >("/api/admin/students", undefined, { refreshInterval: 60000 })

  const dayMarks = useMemo(() => buildDayMarks(rows ?? []), [rows])

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
        name: s.full_name,
        position: s.position,
        times: pays.length,
        total,
        last,
      }
    }).sort((a, b) => a.times - b.times || a.name.localeCompare(b.name))
  }, [rows, students, periodFrom])

  // Matriks: siswa × minggu aktual bulan berjalan (Sen–Min)
  const matriks = useMemo(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()
    const daysInMonth = new Date(y, m + 1, 0).getDate()

    // Potong minggu Senin–Minggu yang menyentuh bulan ini
    const first = new Date(y, m, 1)
    const startOffset = (first.getDay() + 6) % 7 // 0 = Senin
    const totalCells = startOffset + daysInMonth
    const weekCount = Math.ceil(totalCells / 7)
    const weeks = Array.from({ length: weekCount }, (_, i) => i + 1)

    const weekRanges: { from: string; to: string }[] = []
    for (let w = 0; w < weekCount; w++) {
      const dayStart = w * 7 - startOffset + 1
      const dayEnd = dayStart + 6
      const clampStart = Math.max(1, dayStart)
      const clampEnd = Math.min(daysInMonth, dayEnd)
      weekRanges.push({
        from: ymd(y, m, clampStart),
        to: ymd(y, m, clampEnd),
      })
    }

    const inc = (rows ?? []).filter((t) => t.kind === "IN")
    const rowsOut = (students ?? []).map((s) => {
      const name = s.full_name.toLowerCase()
      const perWeek = weekRanges.map(({ from, to }) => {
        return inc.filter((t) => {
          const d = t.description.toLowerCase()
          const match =
            d === name || d.startsWith(name + " ·") || d.includes(name)
          return match && t.occurred_on >= from && t.occurred_on <= to
        }).length
      })
      return { id: s.id, name: s.full_name, perWeek }
    })
    return {
      weeks,
      rows: rowsOut,
      monthLabel: `${MONTHS_ID[m]} ${y}`,
    }
  }, [rows, students])

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
        if (date && t.occurred_on !== date) return false
        return matchesQuery(t, q)
      }),
    [allWithSaldo, only, date, q],
  )

  // Baris buku kas: iuran digabung per hari → "N/M siswa"; transaksi lain baris sendiri
  type LedgerLine = {
    key: string
    tanggal: string
    uraian: string
    masuk: number
    keluar: number
    detail?: Tx
    count?: number
  }

  const ledgerLines = useMemo(() => {
    const totalSiswa = students?.length ?? 0
    const byDay = new Map<string, Tx[]>()
    for (const t of display) {
      const list = byDay.get(t.occurred_on) ?? []
      list.push(t)
      byDay.set(t.occurred_on, list)
    }

    const lines: LedgerLine[] = []
    const days = [...byDay.keys()].sort() // ascending
    for (const day of days) {
      const items = byDay.get(day) ?? []
      const tanggal = formatDateID(new Date(day + "T12:00:00"))

      // Iuran harian: category Iuran / Iuran khusus / deskripsi = nama (collect)
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
        // Hitung unik nama siswa yang cocok roster — bukan unik description
        // (entri batch lama “Rabu · 15 siswa · …” jangan dihitung +1)
        const nameSet = new Set<string>()
        const roster = new Set(
          (students ?? []).map((s) => s.full_name.toLowerCase()),
        )
        for (const t of iuran) {
          const d = t.description.trim().toLowerCase()
          if (roster.has(d)) nameSet.add(d)
          else if (/·\s*\d+\s*siswa\b/i.test(d)) continue // batch lama
          else {
            // cocokkan potongan nama di description (bayar khusus “Nama · note”)
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
          totalSiswa > 0 ? `${paidCount}/${totalSiswa} Siswa` : `${paidCount} Siswa`
        lines.push({
          key: `iuran-${day}`,
          tanggal,
          uraian: label,
          masuk: sum,
          keluar: 0,
          detail: iuran[iuran.length - 1],
          count: paidCount,
        })
      }

      // Transaksi lain (OUT + IN non-iuran)
      const others = items.filter((t) => !iuran.includes(t))
      for (const t of others) {
        lines.push({
          key: t.id,
          tanggal,
          uraian: shortUraian(t),
          masuk: t.kind === "IN" ? t.amount : 0,
          keluar: t.kind === "OUT" ? t.amount : 0,
          detail: t,
        })
      }
    }
    return lines
  }, [display, students])

  const totalIn = display.filter((t) => t.kind === "IN").reduce((s, t) => s + t.amount, 0)
  const totalOut = display.filter((t) => t.kind === "OUT").reduce((s, t) => s + t.amount, 0)
  const hasFilter = Boolean(q.trim() || date || only !== "all")

  return (
    <div className="min-h-full bg-page">
      {/* Header ringkas */}
      <div className="sticky top-0 z-10 bg-white border-b border-line px-4 pt-3 pb-3.5">
        <div className="flex items-center gap-2 mb-3">
          <Link
            href="/app/kas"
            aria-label="Kembali"
            className="flex items-center justify-center text-ink shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex-1 text-[15px] font-bold text-ink leading-tight">Buku Kas</h1>
          <div className="relative shrink-0">
            <button
              ref={calBtnRef}
              type="button"
              onClick={() => {
                if (!calOpen && calBtnRef.current) {
                  const rect = calBtnRef.current.getBoundingClientRect()
                  setCalTop(rect.bottom + 4)
                }
                setCalOpen((v) => !v)
              }}
              aria-label="Pilih tanggal"
              className={`flex items-center gap-1.5 h-8 px-2 rounded-lg border bg-page text-[10px] font-medium text-ink ${
                calOpen ? "border-forest" : "border-line"
              }`}
            >
              <CalendarDays className="h-3.5 w-3.5 text-forest/50" />
              <span className="max-w-[72px] truncate">
                {date ? dmy(date) : "Tanggal"}
              </span>
              {date && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    setDate("")
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.stopPropagation()
                      setDate("")
                    }
                  }}
                  aria-label="Hapus filter tanggal"
                  className="text-ink-soft/40 p-0.5"
                >
                  <X className="h-3 w-3" />
                </span>
              )}
            </button>
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
              ["ledger", "Transaksi"],
              ["siswa", "Per Siswa"],
              ["matriks", "Matriks"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setView(k)}
              className={`py-1.5 rounded-md text-[11px] font-semibold transition ${
                view === k ? "bg-white text-forest shadow-sm" : "text-ink-soft"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Cari — hanya di tab Transaksi */}
        {view === "ledger" && (
          <div className="flex items-center gap-1 bg-page border border-line rounded-lg px-2 h-9 mb-3">
            <Search className="h-3.5 w-3.5 text-ink-soft/40 shrink-0" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama…"
              className="flex-1 min-w-0 bg-transparent text-[12px] text-ink outline-none placeholder:text-ink-soft/40"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="search"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Bersihkan"
                className="shrink-0 p-0.5 text-ink-soft/50"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Baris: filter + reset + total inline — hanya ledger */}
        {view === "ledger" && (
        <div className="flex items-center gap-1.5 mb-1">
          {(
            [
              ["all", "Semua"],
              ["IN", "Masuk"],
              ["OUT", "Keluar"],
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => setOnly(k)}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border shrink-0 ${
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
              <span className="text-ink-soft/25 text-[10px] font-medium shrink-0">|</span>
              <button
                type="button"
                onClick={() => {
                  setQ("")
                  setDate("")
                  setOnly("all")
                }}
                className="text-[10px] font-semibold text-forest shrink-0"
              >
                Reset
              </button>
            </>
          )}

          <div className="ml-auto flex items-center gap-2.5 shrink-0">
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-forest tabular-nums">
              <ArrowUpRight className="h-3 w-3" />
              {rp(totalIn)}
            </span>
            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-alert tabular-nums">
              <ArrowDownRight className="h-3 w-3" />
              {rp(totalOut)}
            </span>
          </div>
        </div>
        )}

        {view === "ledger" && (date || q.trim()) && (
          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
            {date && (
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-forest/10 text-forest">
                {formatDateID(new Date(date + "T12:00:00"))}
                <button type="button" onClick={() => setDate("")} aria-label="Hapus tanggal">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
            {q.trim() && (
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold px-2 py-0.5 rounded-full bg-surface text-ink-soft">
                “{q.trim()}”
                <button type="button" onClick={() => setQ("")} aria-label="Hapus cari">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            )}
          </div>
        )}
      </div>

      <div className="px-3 pb-8 pt-2">
        {view === "matriks" ? (
          <div className="bg-white border border-line shadow-sm rounded-2xl overflow-hidden">
            <div className="px-3 pt-2.5 pb-2 bg-forest text-white">
              <p className="text-[11px] font-medium text-white/90">
                Matriks iuran · {matriks.monthLabel}
              </p>
              <p className="text-[9px] text-white/50 mt-0.5">
                {matriks.weeks.length} minggu · target 2x/minggu
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[9px]">
                <thead>
                  <tr className="bg-page/80 border-b border-line text-ink-soft/60 font-medium">
                    <th className="px-2 py-1.5 text-left sticky left-0 bg-page/80 min-w-[90px]">
                      Nama
                    </th>
                    {matriks.weeks.map((w) => (
                      <th key={w} className="px-0.5 py-1.5 text-center w-9">
                        M{w}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matriks.rows.map((s, i) => (
                    <tr key={s.id} className="border-b border-line/40">
                      <td className="px-2 py-1.5 sticky left-0 bg-white max-w-[100px]">
                        <span className="text-[9px] text-ink-soft/40 mr-1">{i + 1}</span>
                        <span className="text-[10px] font-medium text-ink truncate">
                          {s.name}
                        </span>
                      </td>
                      {s.perWeek.map((c, wi) => {
                        const bg =
                          c >= 2
                            ? "bg-forest text-white"
                            : c === 1
                              ? "bg-amber-400 text-deep"
                              : "bg-alert/12 text-alert"
                        return (
                          <td key={wi} className="px-0.5 py-1 text-center">
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-medium tabular-nums ${bg}`}
                            >
                              {c > 0 ? c : ""}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {matriks.rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={1 + matriks.weeks.length}
                        className="p-5 text-center text-[11px] text-ink-soft/45"
                      >
                        Belum ada data siswa
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 bg-page/60 border-t border-line text-[9px] text-ink-soft/50 font-medium">
              Kotak kosong = belum bayar · hijau ≥2 · kuning 1
            </div>
          </div>
        ) : view === "siswa" ? (
          <div className="bg-white border border-line shadow-sm rounded-2xl overflow-hidden">
            <div className="px-3 pt-2.5 pb-2 bg-forest text-white">
              <p className="text-[11px] font-medium text-white/90">Rekap bayar per siswa</p>
              <div className="mt-2 flex gap-1">
                {(
                  [
                    ["week", "Minggu ini"],
                    ["month", "Bulan ini"],
                    ["all", "Semua"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setPeriod(k)}
                    className={`text-[10px] font-medium px-2 py-1 rounded-full transition ${
                      period === k
                        ? "bg-white text-forest"
                        : "bg-white/15 text-white/80"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1.5 bg-page/80 border-b border-line text-[9px] font-medium uppercase text-ink-soft/55">
              <span className="w-5 text-center shrink-0">No</span>
              <span className="flex-1 min-w-0">Nama</span>
              <span className="w-9 text-center shrink-0">Kali</span>
              <span className="w-[64px] text-right shrink-0">Total</span>
              <span className="w-[48px] text-right shrink-0">Terakhir</span>
            </div>
            <div className="divide-y divide-line/40">
              {perSiswa.map((s, i) => {
                const level = payLevel(s.times)
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-1 px-2.5 py-2 ${level.bg}`}
                  >
                    <span className="w-5 text-center text-[9px] text-ink-soft/40 tabular-nums shrink-0">
                      {i + 1}
                    </span>
                    <p className="flex-1 min-w-0 text-[11px] font-semibold text-ink truncate">
                      {s.name}
                    </p>
                    <span
                      className={`w-9 text-center text-[9px] font-medium tabular-nums shrink-0 ${level.cls}`}
                    >
                      {s.times}x
                    </span>
                    <span
                      className={`w-[64px] text-right text-[9px] font-medium tabular-nums shrink-0 ${level.cls}`}
                    >
                      {s.total ? rp(s.total) : "—"}
                    </span>
                    <span className="w-[48px] text-right text-[9px] text-ink-soft/50 tabular-nums shrink-0">
                      {dmy(s.last)}
                    </span>
                  </div>
                )
              })}
              {perSiswa.length === 0 && (
                <p className="p-5 text-center text-[11px] text-ink-soft/45">
                  Belum ada data siswa
                </p>
              )}
            </div>
            <div className="px-3 py-2 bg-page/60 border-t border-line text-[9px] text-ink-soft/50 font-medium">
              Target 8x/bulan · 0 merah · 2 cokelat · 4 kuning · 6 oranye · 8+ hijau
            </div>
          </div>
        ) : error ? (
          <EmptyState icon={<Inbox className="h-6 w-6" />} message="Gagal memuat buku kas" />
        ) : ledgerLines.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-6 w-6" />}
            message={
              hasFilter
                ? q.trim()
                  ? `Tidak ada “${q.trim()}” di buku kas`
                  : "Tidak ada data di filter ini"
                : "Belum ada transaksi"
            }
          />
        ) : (
          <div className="bg-white border border-line shadow-sm rounded-2xl overflow-hidden">
            <div className="flex items-center gap-1.5 px-2 py-1.5 bg-forest text-white text-[9px] font-medium uppercase tracking-wide">
              <span className="w-5 text-center shrink-0">No</span>
              <span className="w-[64px] shrink-0">Tanggal</span>
              <span className="flex-1 min-w-0">Uraian</span>
              <span className="w-[72px] text-right shrink-0">Masuk</span>
              <span className="w-[72px] text-right shrink-0">Keluar</span>
            </div>

            <div className="divide-y divide-line/40">
              {ledgerLines.map((line, i) => (
                <button
                  key={line.key}
                  type="button"
                  onClick={() => line.detail && void openDetail(line.detail)}
                  className="flex w-full items-center gap-1.5 px-2 py-2 text-left active:bg-page/60 transition-colors"
                >
                  <span className="w-5 text-center text-[9px] text-ink-soft/40 tabular-nums shrink-0">
                    {i + 1}
                  </span>
                  <span className="w-[64px] text-[9px] text-ink-soft/55 shrink-0 leading-tight">
                    {line.detail
                      ? formatDateID(new Date(line.detail.occurred_on + "T12:00:00"))
                      : "—"}
                  </span>
                  <span className="flex-1 min-w-0 text-[11px] font-semibold text-ink truncate">
                    {line.uraian}
                  </span>
                  <span
                    className={`w-[72px] text-right text-[9px] font-medium tabular-nums shrink-0 ${
                      line.masuk ? "text-forest" : "text-ink-soft/20"
                    }`}
                  >
                    {line.masuk ? rp(line.masuk) : "—"}
                  </span>
                  <span
                    className={`w-[72px] text-right text-[9px] font-medium tabular-nums shrink-0 ${
                      line.keluar ? "text-alert" : "text-ink-soft/20"
                    }`}
                  >
                    {line.keluar ? rp(line.keluar) : "—"}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 px-2 py-2 bg-deep text-white">
              <span className="w-5 shrink-0" />
              <span className="w-[64px] shrink-0" />
              <span className="flex-1 text-[9px] font-semibold">TOTAL</span>
              <span className="w-[72px] text-right text-[9px] font-medium text-lime tabular-nums">
                {rp(totalIn)}
              </span>
              <span className="w-[72px] text-right text-[9px] font-medium text-amber tabular-nums">
                {rp(totalOut)}
              </span>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => void mutate()}
          className="mt-3 w-full text-[10px] font-semibold text-ink-soft py-2"
        >
          Muat ulang
        </button>
      </div>

      {/* Detail full-screen */}
      {detail && (
        <div className="fixed inset-0 z-50 bg-page flex flex-col">
          <div className="flex items-center gap-2.5 px-4 py-3 bg-white border-b border-line">
            <button
              type="button"
              onClick={() => setDetail(null)}
              aria-label="Tutup detail"
              className="flex items-center justify-center text-ink"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h2 className="text-[15px] font-bold text-ink flex-1">Detail transaksi</h2>
            <span
              className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                detail.kind === "IN"
                  ? "bg-ok-bg text-forest"
                  : "bg-alert-bg text-alert"
              }`}
            >
              {detail.kind === "IN" ? "MASUK" : "KELUAR"}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {/* Nominal besar */}
            <div
              className={`rounded-2xl p-4 text-center ${
                detail.kind === "IN" ? "bg-forest text-white" : "bg-alert text-white"
              }`}
            >
              <p className="text-[11px] font-medium opacity-80">
                {detail.kind === "IN" ? "Pemasukan" : "Pengeluaran"}
              </p>
              <p className="mt-1 text-3xl font-black tabular-nums">
                {rp(detail.amount)}
              </p>
            </div>

            {/* Tabel field */}
            <div className="bg-white border border-line shadow-sm rounded-2xl overflow-hidden">
              <div className="divide-y divide-line/60">
                {[
                  ["Uraian", shortUraian(detail)],
                  ["Kategori", detail.category || "—"],
                  ["Tanggal kejadian", fullDate(detail.occurred_on)],
                  ["Jam dicatat", formatTimeID(new Date(detail.created_at))],
                  ["Dicatat oleh", detail.recorded_by || "—"],
                  ["ID transaksi", detail.id],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-3 px-3.5 py-3"
                  >
                    <span className="text-[11px] text-ink-soft shrink-0">{label}</span>
                    <span className="text-[12px] font-semibold text-ink text-right min-w-0 break-words">
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Credit bar */}
            <div className="flex items-center gap-2 text-[10px] text-ink-soft/60 px-1">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">
                Terakhir dicatat: <strong className="text-ink font-semibold">{detail.recorded_by || "—"}</strong>
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
                  Status siswa · {fullDate(detail.occurred_on)}
                </h3>
                {dayStatusLoading ? (
                  <p className="text-[11px] text-ink-soft/50">Memuat status…</p>
                ) : dayStatus ? (
                  <>
                    {(
                      [
                        ["Bayar", dayStatus.bayar, "bg-forest text-white", "text-forest"],
                        ["Izin", dayStatus.izin, "bg-amber text-white", "text-amber"],
                        ["Nunggak", dayStatus.nunggak, "bg-alert text-white", "text-alert"],
                      ] as const
                    ).map(([label, names, chip, textCls]) => (
                      <div
                        key={label}
                        className="bg-white border border-line shadow-sm rounded-2xl overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-3 py-2 bg-page/60 border-b border-line">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${chip}`}>
                            {label}
                          </span>
                          <span className="text-[10px] text-ink-soft/60 tabular-nums">
                            {names.length} siswa
                          </span>
                        </div>
                        {names.length === 0 ? (
                          <p className={`px-3 py-2.5 text-[11px] ${textCls} opacity-70`}>
                            Tidak ada
                          </p>
                        ) : (
                          <div className="divide-y divide-line/40">
                            {names.map((n, i) => (
                              <div
                                key={n}
                                className="flex items-center gap-2 px-3 py-2"
                              >
                                <span className="w-5 text-center text-[9px] text-ink-soft/40 tabular-nums shrink-0">
                                  {i + 1}
                                </span>
                                <span className="text-[11px] font-medium text-ink truncate flex-1">
                                  {n}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <p className="text-[9px] text-ink-soft/50 leading-relaxed px-0.5">
                      Izin = tidak tagih hari itu · bisa bayar lain hari lewat “Bayar Khusus”
                      atau setoran berikutnya · tidak otomatis dihitung lunas.
                    </p>
                  </>
                ) : (
                  <p className="text-[11px] text-ink-soft/50">Gagal memuat status siswa</p>
                )}
              </div>
            )}
          </div>

          <div className="px-4 pb-4 pt-2 bg-white border-t border-line">
            <button
              type="button"
              onClick={() => setDetail(null)}
              className="w-full bg-forest text-white text-[13px] font-bold py-3 rounded-xl"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
