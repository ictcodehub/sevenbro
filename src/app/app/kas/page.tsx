"use client"

import { useSession } from "next-auth/react"
import { useState, useRef } from "react"
import Link from "next/link"
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  Inbox,
  Check,
  History,
  Coins,
  ReceiptText,
  RotateCcw,
  BookOpen,
  AlertTriangle,
  ChevronRight,
} from "lucide-react"
import { SectionHeader, EmptyState } from "@/components/ui-primitives"
import { useAppSWR } from "@/lib/fetcher"
import { formatIDR, formatDateID, formatTimeID, formatDisplayName } from "@/lib/format"
import { Sheet, Field, inputClass } from "@/components/ui/sheet"
import { canManageKas, canViewKas } from "@/lib/policies"
import { RoleGate } from "@/components/RoleGate"
import FeatureGate from "@/components/FeatureGate"
import { useI18n, useT } from "@/lib/i18n"
import { VerifiedBadge, usePositions } from "@/components/VerifiedBadge"

/** Kas: manage = HOMEROOM & BENDAHARA; siswa lain read-only */
const PAGE_ROLES = ["HOMEROOM", "BENDAHARA", "KETUA", "SEKRETARIS", "ANGGOTA"]
const NOMINAL = 1000

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

type Summary = {
  balance: number
  month: { id: string; title: string; amount: number; month_key: string } | null
  paidCount: number
  totalCount: number
  myPaid: number | null
  recent: Tx[]
  monthIn: number
  monthOut: number
  lastActivity: {
    kind: string
    at: string
    by: string
    label: string
    amount: number
  } | null
  role: string
  actor: { name: string; email: string | null }
}

type TunggakPayload = {
  amountPer: number
  from: string
  collectionDays: number
  totalTunggak: number
  rows: {
    id: string
    name: string
    tunggak: number
    expected: number
    paid: number
    izinDays: number
    paidTimes: number
  }[]
  all: {
    id: string
    name: string
    tunggak: number
    expected: number
    paid: number
    izinDays: number
    paidTimes: number
  }[]
}

type StudentRow = {
  id: string
  full_name: string
  position: string
  active: boolean
}

function firstName(name: string) {
  const w = name.trim().split(/\s+/)
  return w[0] || name
}

function actorName(
  raw: string | null,
  sessionName?: string,
  sessionEmail?: string,
): string {
  if (!raw) return "—"
  if (sessionEmail && raw.toLowerCase() === sessionEmail.toLowerCase()) {
    return firstName(sessionName || raw)
  }
  if (raw.includes("@")) return firstName(raw.split("@")[0])
  return firstName(raw)
}

function whenShort(iso: string, lang?: "id" | "en") {
  try {
    const d = new Date(iso)
    return `${formatDateID(d, lang)} · ${formatTimeID(d)}`
  } catch {
    return iso
  }
}

function todayLabel(lang?: "id" | "en") {
  const hariID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
  const hariEN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  const d = new Date()
  const hari = lang === "en" ? hariEN : hariID
  return `${hari[d.getDay()]}, ${formatDateID(d, lang)}`
}

/** Input tanggal kejadian (backdate) — kosong = hari ini */
function BackdateInput({
  value,
  onChange,
  max,
  compact = false,
}: {
  value: string
  onChange: (v: string) => void
  max: string
  compact?: boolean
}) {
  return (
    <input
      type="date"
      value={value}
      max={max}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Tanggal kejadian"
      className={
        compact
          ? "shrink-0 h-7 text-[11px] text-ink bg-white border border-line rounded-lg px-1.5"
          : inputClass
      }
    />
  )
}

export default function KasPage() {
  const t = useT()
  return (
    <RoleGate allow={PAGE_ROLES}>
      <FeatureGate feature="kas_enabled" label={t("kas.special")}>
        <KasInner />
      </FeatureGate>
    </RoleGate>
  )
}

function KasInner() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const canManage = canManageKas(role ?? "")
  const canView = canViewKas(role ?? "")
  // Backdate: tanggal kejadian untuk input manual (kosong = hari ini)
  const [backdate, setBackdate] = useState("")

  const { data, error, mutate } = useAppSWR<Summary>("/api/kas/summary", undefined, {
    refreshInterval: 10000,
  })
  const { data: students } = useAppSWR<StudentRow[]>(
    canManage ? "/api/admin/students" : null,
  )
  const today = new Date().toISOString().slice(0, 10)
  const { data: tunggak, mutate: mutateTunggak } = useAppSWR<TunggakPayload>(
    canManage ? `/api/kas/tunggak?amountPer=${NOMINAL}` : null,
    undefined,
    { refreshInterval: 20000 },
  )

  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [openOut, setOpenOut] = useState(false)
  const [outAmount, setOutAmount] = useState("")
  const [outNote, setOutNote] = useState("")
  const [savingOut, setSavingOut] = useState(false)
  const savingOutRef = useRef(false)
  const [openRefund, setOpenRefund] = useState(false)
  const [refundAmount, setRefundAmount] = useState("")
  const [refundNote, setRefundNote] = useState("")
  const [savingRefund, setSavingRefund] = useState(false)
  const savingRefundRef = useRef(false)
  const [detailTx, setDetailTx] = useState<Tx | null>(null)
  const [openSpecial, setOpenSpecial] = useState(false)
  const [spStudent, setSpStudent] = useState("")
  const [spAmount, setSpAmount] = useState("20000")
  const [spNote, setSpNote] = useState("")
  const [savingSp, setSavingSp] = useState(false)
  const { lang, t } = useI18n()
  const posIndex = usePositions("kas")

  const list = students ?? []
  const totalPick = picked.size
  const totalRupiah = totalPick * NOMINAL
  const tunggakByName = new Map(
    (tunggak?.all ?? []).map((r) => [r.name.toLowerCase(), r]),
  )

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const toggle = (id: string) => {
    setPicked((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const selectAll = () => {
    setPicked(new Set(list.map((s) => s.id)))
    flash(t("kas.checkedCount", { n: list.length }))
  }

  const clearAll = () => {
    setPicked(new Set())
    flash(t("kas.pickCleared"))
  }

  const saveCollect = async () => {
    setErr(null)
    if (totalPick === 0) return
    setSaving(true)
    try {
      const bayarIds = [...picked]
      if (bayarIds.length === 0) {
        flash(t("kas.noPaySelection"))
        setSaving(false)
        return
      }
      const r = await fetch("/api/kas/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: bayarIds,
          amountPer: NOMINAL,
          ...(backdate ? { occurred_on: backdate } : {}),
        }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || t("common.failedWithStatus", { status: r.status }))
      flash(b?.message || t("kas.depositSaved"))
      setBackdate("")
      setPicked(new Set())
      await Promise.all([mutate(), mutateTunggak()])
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("common.failed"))
    } finally {
      setSaving(false)
    }
  }

  const saveSpecial = async () => {
    setErr(null)
    const n = Number(spAmount)
    const name = list.find((s) => s.id === spStudent)?.full_name
    if (!spStudent || !Number.isFinite(n) || n <= 0) {
      setErr(t("kas.specialSelectError"))
      return
    }
    setSavingSp(true)
    try {
      const kali = Math.round(n / NOMINAL)
      const note = spNote.trim() || (kali > 1 ? t("kas.payNx", { n: kali }) : t("kas.special"))
      const r = await fetch("/api/kas/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "IN",
          category: "Iuran khusus",
          description: `${name} · ${note}`,
          amount: n,
          student_id: spStudent,
          ...(backdate ? { occurred_on: backdate } : {}),
        }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || t("common.failedWithStatus", { status: r.status }))
      setOpenSpecial(false)
      setSpStudent("")
      setSpNote("")
      setSpAmount("20000")
      setBackdate("")
      flash(t("kas.recordedFor", { name: name ?? "", amount: formatIDR(n) }))
      await mutate()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("common.failed"))
    } finally {
      setSavingSp(false)
    }
  }

  const saveOut = async () => {
    setErr(null)
    const clean = outAmount.replace(/\D/g, "")
    const n = Number(clean)
    if (!outNote.trim() || !Number.isFinite(n) || n <= 0) {
      setErr(t("kas.descRequired"))
      return
    }
    if (savingOutRef.current) return
    savingOutRef.current = true
    setSavingOut(true)
    try {
      const r = await fetch("/api/kas/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "OUT",
          category: "Pengeluaran",
          description: outNote.trim(),
          amount: n,
          ...(backdate ? { occurred_on: backdate } : {}),
        }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || t("common.failedWithStatus", { status: r.status }))
      setOpenOut(false)
      setOutAmount("")
      setOutNote("")
      setBackdate("")
      flash(t("kas.expenseRecorded"))
      await mutate()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("common.failed"))
    } finally {
      savingOutRef.current = false
      setSavingOut(false)
    }
  }

  const saveRefund = async () => {
    setErr(null)
    const clean = refundAmount.replace(/\D/g, "")
    const n = Number(clean)
    if (!refundNote.trim() || !Number.isFinite(n) || n <= 0) {
      setErr(t("kas.refundRequired"))
      return
    }
    if (savingRefundRef.current) return
    savingRefundRef.current = true
    setSavingRefund(true)
    try {
      const r = await fetch("/api/kas/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "IN",
          category: "Sisa Pengeluaran",
          description: refundNote.trim(),
          amount: n,
          ...(backdate ? { occurred_on: backdate } : {}),
        }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || t("common.failedWithStatus", { status: r.status }))
      setOpenRefund(false)
      setRefundAmount("")
      setRefundNote("")
      setBackdate("")
      flash(t("kas.refundRecorded"))
      await mutate()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("common.failed"))
    } finally {
      savingRefundRef.current = false
      setSavingRefund(false)
    }
  }

  return (
    <div className="px-4 py-3 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-ink">{t("kas.pageTitle")}</h1>
          <p className="text-[11px] text-ink-soft/75">
            {canManage ? t("kas.hintManage") : t("kas.hintReadOnly")}
          </p>
        </div>
        <Link
          href="/app/kas/buku"
          className="flex items-center gap-1.5 bg-white border border-line shadow-sm text-forest text-[11px] font-bold px-2.5 py-1.5 rounded-xl active:scale-[0.95] transition-transform shrink-0"
        >
          <BookOpen className="h-4 w-4" />
          {t("kas.book")}
        </Link>
      </div>

      {error ? (
        <EmptyState icon={<Inbox className="h-6 w-6" />} message={t("kas.loadError")} />
      ) : (
        <>
          {/* Saldo + tombol aksi sejajar (aksi hanya manage) */}
          <div className="flex items-stretch gap-2">
            <Link
              href="/app/kas/buku"
              aria-label={t("kas.book")}
              className={`bg-deep rounded-2xl p-3.5 text-white flex flex-col justify-between active:scale-[0.98] hover:opacity-95 transition-all cursor-pointer shadow-sm group ${
                canManage ? "w-[58%]" : "w-full"
              }`}
            >
              <div>
                <span className="flex items-center gap-1.5 text-xs font-medium text-white/70">
                  <Wallet className="h-3.5 w-3.5" />
                  <span className="truncate">{t("kas.balanceTitle")}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-white/40 ml-auto group-hover:translate-x-0.5 transition-transform shrink-0" />
                </span>
                <p className="mt-1.5 text-2xl font-bold leading-none text-acid">
                  {formatIDR(data?.balance ?? 0)}
                </p>
                <div className="mt-2 flex flex-nowrap items-center gap-1 min-w-0">
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-lime/15 border border-lime/30 px-1.5 py-0.5 text-[10px] font-semibold text-lime min-w-0 truncate">
                    ↑ {formatIDR(data?.monthIn ?? 0)}
                  </span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-amber/15 border border-amber/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber min-w-0 truncate">
                    ↓ {formatIDR(data?.monthOut ?? 0)}
                  </span>
                </div>
              </div>
              {data?.lastActivity && (
                <p className="mt-2 text-[11px] text-white/45 truncate border-t border-white/10 pt-2">
                  {data.lastActivity.by} · {whenShort(data.lastActivity.at)}
                </p>
              )}
            </Link>

            {canManage && (
              <div className="w-[42%] flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => setOpenSpecial(true)}
                  className="flex-1 rounded-xl bg-white border border-line shadow-sm px-2 py-1.5 flex items-center gap-1.5 active:scale-[0.97] transition-transform"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-forest/10 text-forest shrink-0">
                    <Coins className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block text-xs font-semibold leading-tight truncate">
                      {t("kas.special")}
                    </span>
                    <span className="block text-[9.5px] text-ink-soft/55 leading-tight mt-0.5 truncate">
                      {t("kas.freeNominal")}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpenOut(true)}
                  className="flex-1 rounded-xl bg-white border border-line shadow-sm px-2 py-1.5 flex items-center gap-1.5 active:scale-[0.97] transition-transform"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-alert/10 text-alert shrink-0">
                    <ReceiptText className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block text-xs font-semibold leading-tight truncate">
                      {t("kas.expense")}
                    </span>
                    <span className="block text-[9.5px] text-ink-soft/55 leading-tight mt-0.5 truncate">
                      {t("kas.expenseHint")}
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpenRefund(true)}
                  className="flex-1 rounded-xl bg-white border border-line shadow-sm px-2 py-1.5 flex items-center gap-1.5 active:scale-[0.97] transition-transform"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                    <RotateCcw className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block text-xs font-semibold leading-tight truncate">
                      {t("kas.refund")}
                    </span>
                    <span className="block text-[9.5px] text-ink-soft/55 leading-tight mt-0.5 truncate">
                      {t("kas.refundHint")}
                    </span>
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Status iuran pribadi — read-only viewer */}
          {!canManage && canView && (
            <div className="bg-white border border-line shadow-sm rounded-xl p-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-ink-soft/70">{t("kas.myShareMonth")}</p>
                <p className="mt-0.5 text-sm font-bold text-forest tabular-nums">
                  {data?.myPaid != null && data.myPaid > 0
                    ? formatIDR(data.myPaid)
                    : t("kas.notRecorded")}
                </p>
              </div>
              {data?.month && (
                <p className="text-[11px] text-ink-soft/55 text-right shrink-0">
                  {data.month.title}
                  <br />
                  {formatIDR(data.month.amount)}{t("kas.perPerson")}
                </p>
              )}
            </div>
          )}

          {canManage && (
            <div className="bg-white border border-line shadow-sm rounded-2xl overflow-hidden">
              <div className="px-3.5 pt-3.5 pb-2 bg-page/60 border-b border-line">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink truncate">{t("kas.todayDeposit")}</p>
                    <p className="text-[11px] text-ink-soft/70 mt-0.5 truncate">
                      {backdate
                        ? `${formatDateID(new Date(backdate + "T12:00:00"), lang)} · backdate`
                        : todayLabel(lang)}{" "}
                      · {formatIDR(NOMINAL)}{t("kas.perPerson")}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] font-bold bg-forest text-white px-2.5 py-1 rounded-full tabular-nums">
                    {totalPick} · {formatIDR(totalRupiah)}
                  </span>
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={selectAll}
                      className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white border border-line text-ink"
                    >
                      {t("common.all")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void clearAll()}
                      disabled={saving}
                      className="shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white border border-line text-ink-soft disabled:opacity-50"
                    >
                      {t("kas.clear")}
                    </button>
                  </div>
                  <BackdateInput
                    value={backdate}
                    onChange={setBackdate}
                    max={today}
                    compact
                  />
                </div>
              </div>

              {err && (
                <p className="px-3.5 py-2 text-xs text-alert bg-alert-bg">{err}</p>
              )}

              {/* Tabel: No | Nama | Bayar */}
              <div>
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-page/80 border-b border-line text-[11px] font-medium uppercase tracking-wide text-ink-soft/60">
                  <span className="w-6 text-center shrink-0">{t("kas.colNo")}</span>
                  <span className="flex-1 min-w-0">{t("kas.colName")}</span>
                  <span className="w-12 text-center shrink-0">{t("kas.pay")}</span>
                </div>
                {list.length === 0 ? (
                  <p className="p-5 text-center text-xs text-ink-soft/60">
                    {t("kas.loadingStudents")}
                  </p>
                ) : (
                  <div className="divide-y divide-line/40">
                    {list.map((s, i) => {
                      const on = picked.has(s.id)
                      return (
                        <div
                          key={s.id}
                          onClick={() => toggle(s.id)}
                          className={`flex items-center gap-2 px-2.5 py-2.5 cursor-pointer transition-colors ${
                            on ? "bg-forest/8" : "bg-white hover:bg-page/40"
                          }`}
                        >
                          <span className="w-6 text-center text-[11px] font-medium text-ink-soft/50 tabular-nums shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-semibold truncate ${
                                on ? "text-forest" : "text-ink"
                              }`}
                            >
                              {formatDisplayName(s.full_name)}
                              <VerifiedBadge
                                position={s.position || posIndex.byId.get(s.id)}
                                className="ml-1 h-3 w-3"
                              />
                            </p>
                            {(() => {
                              if (!tunggak) return null
                              const row = tunggakByName.get(s.full_name.toLowerCase())
                              if (row && row.tunggak > 0) {
                                return (
                                  <p className="mt-0.5 text-[11px] text-ink-soft/70">
                                    {t("kas.arrearsLabel")}{" "}
                                    <span className="font-semibold text-alert">
                                      {formatIDR(row.tunggak)}
                                    </span>{" "}
                                    / {formatIDR(row.expected)}
                                  </p>
                                )
                              }
                              return (
                                <p className="mt-0.5 text-[11px] text-forest/70 flex items-center gap-1">
                                  <Check className="h-3 w-3" />
                                  {t("kas.paidOff")}
                                </p>
                              )
                            })()}
                          </div>
                          <div className="w-12 shrink-0 flex justify-center">
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                                on
                                  ? "bg-forest border-forest text-white"
                                  : "bg-white border-line text-transparent"
                              }`}
                            >
                              <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-line bg-page/40">
                <button
                  type="button"
                  disabled={saving || totalPick === 0}
                  onClick={() => void saveCollect()}
                  className="w-full bg-forest text-white text-sm font-bold py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98]"
                >
                  <Check className="h-4 w-4" />
                  {saving
                    ? t("kas.saving")
                    : totalPick === 0
                      ? t("kas.hintManage")
                      : t("kas.saveDepositCount", { n: totalPick, amount: formatIDR(totalRupiah) })}
                </button>
              </div>
            </div>
          )}

          {/* Ringkasan tunggak — detail di bawah nama */}
          {canManage && tunggak && (tunggak.rows?.length ?? 0) > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-alert/8 border border-alert/15 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-alert shrink-0" />
              <p className="text-xs text-ink-soft/70 flex-1 min-w-0">
                {t("kas.arrearsLine", { n: tunggak.rows.length })}
              </p>
              <span className="text-xs font-semibold text-alert shrink-0">
                {formatIDR(tunggak.totalTunggak)}
              </span>
            </div>
          )}
        </>
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-forest text-white text-xs font-bold px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Detail riwayat */}
      <Sheet
        open={Boolean(detailTx)}
        onClose={() => setDetailTx(null)}
        title={t("kas.txDetail")}
      >
        {detailTx && (
          <div className="space-y-3">
            {(() => {
              const isDetailRefund = Boolean(
                detailTx.category &&
                  (detailTx.category.toLowerCase().includes("sisa") ||
                    detailTx.category.toLowerCase().includes("refund") ||
                    detailTx.category.toLowerCase().includes("pengembalian"))
              )
              return (
                <div
                  className={`rounded-xl p-3 flex items-center justify-between ${
                    isDetailRefund
                      ? "bg-amber-500/15 border border-amber-500/25"
                      : detailTx.kind === "IN"
                      ? "bg-ok-bg"
                      : "bg-alert-bg"
                  }`}
                >
                  <div>
                    <p
                      className={`text-xs font-semibold uppercase ${
                        isDetailRefund
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-ink-soft/70"
                      }`}
                    >
                      {isDetailRefund
                        ? t("kas.refundUpper")
                        : detailTx.kind === "IN"
                        ? t("home.in")
                        : t("home.out")}
                    </p>
                    <p className="text-xs text-ink-soft">{detailTx.category}</p>
                  </div>
                  <p
                    className={`text-lg font-black ${
                      isDetailRefund
                        ? "text-amber-600 dark:text-amber-400"
                        : detailTx.kind === "IN"
                        ? "text-forest"
                        : "text-alert"
                    }`}
                  >
                    {detailTx.kind === "IN" ? "+" : "−"}
                    {formatIDR(detailTx.amount)}
                  </p>
                </div>
              )
            })()}
            <div className="space-y-2 text-sm-plus">
              <div className="flex justify-between gap-3">
                <span className="text-ink-soft">{t("kas.descLabel")}</span>
                <span className="font-semibold text-ink text-right flex-1">
                  {detailTx.description || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink-soft">{t("kas.recordedBy")}</span>
                <span className="font-semibold text-ink text-right flex-1">
                  {actorName(
                    detailTx.recorded_by,
                    session?.user?.name ?? undefined,
                    session?.user?.email ?? undefined,
                  )}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink-soft">{t("kas.recordDate")}</span>
                <span className="font-semibold text-ink text-right flex-1">
                  {whenShort(detailTx.created_at, lang)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink-soft">{t("kas.eventDate")}</span>
                <span className="font-semibold text-ink text-right flex-1">
                  {formatDateID(new Date(detailTx.occurred_on), lang)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink-soft">ID</span>
                <span className="text-[11px] text-ink-soft/50 text-right flex-1 font-mono truncate">
                  {detailTx.id}
                </span>
              </div>
            </div>
          </div>
        )}
      </Sheet>

      {/* Bayar khusus — nominal bebas (mis. numpuk 20rb) */}
      <Sheet
        open={openSpecial}
        onClose={() => setOpenSpecial(false)}
        title={t("kas.special")}
      >
        {err && (
          <p className="text-xs text-alert bg-alert-bg border border-alert/20 rounded-xl px-3 py-2">
            {err}
          </p>
        )}
        <Field label={t("kas.student")}>
          <select
            value={spStudent}
            onChange={(e) => {
              const id = e.target.value
              setSpStudent(id)
              const name = list.find((s) => s.id === id)?.full_name
              const row = name
                ? (tunggak?.all ?? []).find(
                    (r) => r.name.toLowerCase() === name.toLowerCase(),
                  )
                : undefined
              if (row && row.tunggak > 0) {
                setSpAmount(String(row.tunggak))
                if (!spNote) setSpNote("Lunas tunggak semester")
              }
            }}
            className={inputClass}
          >
            <option value="">{t("kas.pickStudent")}</option>
            {list.map((s) => {
              const row = tunggakByName.get(s.full_name.toLowerCase())
              const badge = row && row.tunggak > 0 ? t("kas.arrearsBadge", { amount: formatIDR(row.tunggak) }) : ""
              return (
                <option key={s.id} value={s.id}>
                  {formatDisplayName(s.full_name)} {badge}
                </option>
              )
            })}
          </select>
        </Field>

        {/* Ringkasan utang siswa terpilih */}
        {(() => {
          const name = list.find((s) => s.id === spStudent)?.full_name
          const row = name
            ? (tunggak?.all ?? []).find(
                (r) => r.name.toLowerCase() === name.toLowerCase(),
              )
            : undefined
          if (!spStudent || !row) return null
          return (
            <div
              className={`rounded-xl border px-3 py-2.5 ${
                row.tunggak > 0
                  ? "bg-alert/8 border-alert/20"
                  : "bg-ok-bg/50 border-forest/20"
              }`}
            >
              <p className="text-sm font-semibold text-ink mb-1.5">
                {formatDisplayName(row.name)}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[11px] text-ink-soft/55">{t("common.required")}</p>
                  <p className="text-xs font-semibold text-ink tabular-nums">
                    {formatIDR(row.expected)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-ink-soft/55">{t("kas.paid")}</p>
                  <p className="text-xs font-semibold text-forest tabular-nums">
                    {formatIDR(row.paid)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-ink-soft/55">{t("kas.arrearsLeft")}</p>
                  <p
                    className={`text-xs font-semibold tabular-nums ${
                      row.tunggak > 0 ? "text-alert" : "text-forest"
                    }`}
                  >
                    {row.tunggak > 0 ? formatIDR(row.tunggak) : t("kas.paidOffCheck")}
                  </p>
                </div>
              </div>
              {row.tunggak > 0 && (
                <button
                  type="button"
                  onClick={() => setSpAmount(String(row.tunggak))}
                  className="mt-2 w-full text-xs font-semibold text-forest py-1 rounded-lg border border-forest/30"
                >
                  {t("kas.useArrears", { amount: formatIDR(row.tunggak) })}
                </button>
              )}
            </div>
          )
        })()}
        <div className="space-y-1">
          <span className="text-sm font-semibold text-ink">{t("kas.nominal")}</span>
          <div className="grid grid-cols-4 gap-1.5">
            {[1000, 10000, 20000, 50000].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setSpAmount(String(n))}
                className={`rounded-lg py-2 text-xs font-bold border ${
                  Number(spAmount) === n
                    ? "bg-forest text-white border-forest"
                    : "bg-white text-ink border-line"
                }`}
              >
                {n / 1000}k
              </button>
            ))}
          </div>
        </div>
        <Field label={t("kas.amountRp")}>
          <input
            type="number"
            inputMode="numeric"
            min={1000}
            step={1000}
            value={spAmount}
            onChange={(e) => setSpAmount(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={t("kas.eventDate")}>
          <BackdateInput value={backdate} onChange={setBackdate} max={today} />
        </Field>
        <Field label={t("kas.noteOptional")} hint={t("kas.noteHint")}>
          <input
            value={spNote}
            onChange={(e) => setSpNote(e.target.value)}
            className={inputClass}
            placeholder={t("kas.notePlaceholder")}
          />
        </Field>
        {Number(spAmount) > 0 && spStudent && (
          <p className="text-xs font-semibold text-forest">
            {t("kas.dailyCount", { n: Math.round(Number(spAmount) / NOMINAL) })}
          </p>
        )}
        <button
          type="button"
          disabled={savingSp || !spStudent || !spAmount}
          onClick={() => void saveSpecial()}
          className="w-full bg-forest text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50"
        >
          {savingSp ? t("kas.saving") : t("kas.saveSpecial")}
        </button>
      </Sheet>

      {/* Pengeluaran */}
      <Sheet open={openOut} onClose={() => setOpenOut(false)} title={t("kas.expense")}>
        {err && (
          <p className="text-xs text-alert bg-alert-bg border border-alert/20 rounded-xl px-3 py-2">
            {err}
          </p>
        )}
        <Field label={t("kas.descLabel")}>
          <input
            value={outNote}
            onChange={(e) => setOutNote(e.target.value)}
            className={inputClass}
            placeholder={t("kas.expensePlaceholder")}
          />
        </Field>
        <div className="space-y-1">
          <span className="text-sm font-semibold text-ink">{t("kas.nominal")}</span>
          <div className="grid grid-cols-5 gap-1.5">
            {[10000, 20000, 30000, 50000, 100000].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setOutAmount(num.toLocaleString("id-ID"))}
                className={`rounded-lg py-1.5 text-xs font-bold border transition-colors ${
                  Number(outAmount.replace(/\D/g, "")) === num
                    ? "bg-forest text-white border-forest"
                    : "bg-white text-ink border-line hover:bg-page"
                }`}
              >
                {num >= 1000 ? `${num / 1000}k` : num}
              </button>
            ))}
          </div>
        </div>
        <Field label={t("kas.amountRp")}>
          <input
            type="text"
            inputMode="numeric"
            value={outAmount}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "")
              if (!digits) {
                setOutAmount("")
                return
              }
              setOutAmount(Number(digits).toLocaleString("id-ID"))
            }}
            className={inputClass}
            placeholder="30.000"
          />
        </Field>
        {Number(outAmount.replace(/\D/g, "")) > 0 && (
          <p className="text-xs font-semibold text-forest">
            {formatIDR(Number(outAmount.replace(/\D/g, "")))}
          </p>
        )}
        <Field label={t("kas.eventDate")}>
          <BackdateInput value={backdate} onChange={setBackdate} max={today} />
        </Field>
        <button
          type="button"
          disabled={savingOut}
          onClick={() => void saveOut()}
          className="w-full bg-forest text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50"
        >
          {savingOut ? t("kas.saving") : t("common.save")}
        </button>
      </Sheet>

      {/* Sisa Belanja / Pengembalian Dana */}
      <Sheet open={openRefund} onClose={() => setOpenRefund(false)} title={t("kas.refundTitle")}>
        {err && (
          <p className="text-xs text-alert bg-alert-bg border border-alert/20 rounded-xl px-3 py-2">
            {err}
          </p>
        )}
        <Field label={t("kas.descLabel")}>
          <input
            value={refundNote}
            onChange={(e) => setRefundNote(e.target.value)}
            className={inputClass}
            placeholder={t("kas.refundPlaceholder")}
          />
        </Field>
        <div className="space-y-1">
          <span className="text-sm font-semibold text-ink">{t("kas.nominal")}</span>
          <div className="grid grid-cols-5 gap-1.5">
            {[5000, 10000, 15000, 20000, 30000].map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => setRefundAmount(num.toLocaleString("id-ID"))}
                className={`rounded-lg py-1.5 text-xs font-bold border transition-colors ${
                  Number(refundAmount.replace(/\D/g, "")) === num
                    ? "bg-amber-600 text-white border-amber-600"
                    : "bg-white text-ink border-line hover:bg-page"
                }`}
              >
                {num >= 1000 ? `${num / 1000}k` : num}
              </button>
            ))}
          </div>
        </div>
        <Field label={t("kas.amountRp")}>
          <input
            type="text"
            inputMode="numeric"
            value={refundAmount}
            onChange={(e) => {
              const digits = e.target.value.replace(/\D/g, "")
              if (!digits) {
                setRefundAmount("")
                return
              }
              setRefundAmount(Number(digits).toLocaleString("id-ID"))
            }}
            className={inputClass}
            placeholder="8.000"
          />
        </Field>
        {Number(refundAmount.replace(/\D/g, "")) > 0 && (
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">
            {formatIDR(Number(refundAmount.replace(/\D/g, "")))}
          </p>
        )}
        <Field label={t("kas.eventDate")}>
          <BackdateInput value={backdate} onChange={setBackdate} max={today} />
        </Field>
        <button
          type="button"
          disabled={savingRefund}
          onClick={() => void saveRefund()}
          className="w-full bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50 transition-colors"
        >
          {savingRefund ? t("kas.saving") : t("kas.saveRefund")}
        </button>
      </Sheet>

      <div className="h-2" />
    </div>
  )
}
