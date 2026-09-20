"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"
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
  BookOpen,
  AlertTriangle,
} from "lucide-react"
import { SectionHeader, EmptyState } from "@/components/ui-primitives"
import { useAppSWR } from "@/lib/fetcher"
import { formatIDR, formatDateID, formatTimeID, formatDisplayName } from "@/lib/format"
import { Sheet, Field, inputClass } from "@/components/ui/sheet"
import { canManageKas, canViewKas } from "@/lib/policies"
import { RoleGate } from "@/components/RoleGate"
import FeatureGate from "@/components/FeatureGate"

/** Kas: manage = HOMEROOM & BENDAHARA; siswa lain read-only */
const PAGE_ROLES = ["HOMEROOM", "BENDAHARA", "KETUA", "SEKRETARIS", "ANGGOTA"]
const NOMINAL = 2000

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

function whenShort(iso: string) {
  try {
    const d = new Date(iso)
    return `${formatDateID(d)} · ${formatTimeID(d)}`
  } catch {
    return iso
  }
}

function todayLabel() {
  const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"]
  const d = new Date()
  return `${hari[d.getDay()]}, ${formatDateID(d)}`
}

function isCollectionDay() {
  const day = new Date().getDay()
  return day === 2 || day === 4 // Selasa / Kamis
}

export default function KasPage() {
  return (
    <RoleGate allow={PAGE_ROLES}>
      <FeatureGate feature="kas_enabled" label="Kas">
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

  const { data, error, mutate } = useAppSWR<Summary>("/api/kas/summary", undefined, {
    refreshInterval: 10000,
  })
  const { data: students } = useAppSWR<StudentRow[]>(
    canManage ? "/api/admin/students" : null,
  )
  const today = new Date().toISOString().slice(0, 10)
  const { data: izinRows, mutate: mutateIzin } = useAppSWR<
    { id: string; student_id: string; occurred_on: string }[]
  >(canManage ? `/api/kas/izin?date=${today}` : null)
  const { data: tunggak, mutate: mutateTunggak } = useAppSWR<TunggakPayload>(
    canManage ? `/api/kas/tunggak?amountPer=${NOMINAL}` : null,
    undefined,
    { refreshInterval: 20000 },
  )

  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [markMode, setMarkMode] = useState<"bayar" | "izin">("bayar")
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [openOut, setOpenOut] = useState(false)
  const [outAmount, setOutAmount] = useState("")
  const [outNote, setOutNote] = useState("")
  const [savingOut, setSavingOut] = useState(false)
  const [detailTx, setDetailTx] = useState<Tx | null>(null)
  const [openSpecial, setOpenSpecial] = useState(false)
  const [spStudent, setSpStudent] = useState("")
  const [spAmount, setSpAmount] = useState("20000")
  const [spNote, setSpNote] = useState("")
  const [savingSp, setSavingSp] = useState(false)

  const collectionDay = isCollectionDay()
  const list = students ?? []
  const totalPick = picked.size
  const totalRupiah = totalPick * NOMINAL
  const izinIds = new Set((izinRows ?? []).map((r) => r.student_id))
  const tunggakByName = new Map(
    (tunggak?.all ?? []).map((r) => [r.name.toLowerCase(), r]),
  )

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const toggle = (id: string) => {
    // Bayar & izin saling eksklusif di hari yang sama
    if (izinIds.has(id) && !picked.has(id)) {
      flash("Siswa ini sudah izin hari ini")
      return
    }
    setPicked((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  const selectAll = () => {
    if (markMode === "izin") {
      const ids = list.map((s) => s.id).filter((id) => !izinIds.has(id))
      if (ids.length === 0) {
        flash("Semua siswa sudah izin")
        return
      }
      void (async () => {
        setSaving(true)
        try {
          const r = await fetch("/api/kas/izin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ studentIds: ids, date: today }),
          })
          const b = await r.json().catch(() => null)
          if (!r.ok) throw new Error(b?.error || "Gagal")
          flash(`${ids.length} siswa ditandai izin`)
          await Promise.all([mutateIzin(), mutate(), mutateTunggak()])
        } catch (e) {
          flash(e instanceof Error ? e.message : "Gagal")
        } finally {
          setSaving(false)
        }
      })()
      return
    }
    setPicked(new Set(list.map((s) => s.id)))
    flash(`${list.length} siswa dicentang`)
  }

  const clearAll = async () => {
    setPicked(new Set())
    if (markMode === "izin") {
      const ids = [...izinIds]
      if (ids.length === 0) {
        flash("Belum ada izin hari ini")
        return
      }
      setSaving(true)
      try {
        for (const id of ids) {
          await fetch(`/api/kas/izin?studentId=${id}&date=${today}`, {
            method: "DELETE",
          })
        }
        flash(`${ids.length} izin dihapus`)
        await Promise.all([mutateIzin(), mutate(), mutateTunggak()])
      } catch {
        flash("Gagal menghapus izin")
      } finally {
        setSaving(false)
      }
      return
    }
    flash("Centang pembayaran dikosongkan")
  }

  const saveCollect = async () => {
    setErr(null)
    if (totalPick === 0) return
    setSaving(true)
    try {
      if (markMode === "izin") {
        const r = await fetch("/api/kas/izin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentIds: [...picked], date: today }),
        })
        const b = await r.json().catch(() => null)
        if (!r.ok) throw new Error(b?.error || `Gagal (${r.status})`)
        flash(b?.message || "Izin tersimpan")
      } else {
        const bayarIds = [...picked].filter((id) => !izinIds.has(id))
        if (bayarIds.length === 0) {
          flash("Tidak ada siswa yang dipilih untuk bayar")
          setSaving(false)
          return
        }
        const r = await fetch("/api/kas/collect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentIds: bayarIds, amountPer: NOMINAL }),
        })
        const b = await r.json().catch(() => null)
        if (!r.ok) throw new Error(b?.error || `Gagal (${r.status})`)
        flash(b?.message || "Setoran tersimpan")
      }
      setPicked(new Set())
      await Promise.all([mutate(), mutateIzin(), mutateTunggak()])
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal")
    } finally {
      setSaving(false)
    }
  }

  const toggleIzin = async (id: string) => {
    try {
      if (izinIds.has(id)) {
        const r = await fetch(
          `/api/kas/izin?studentId=${id}&date=${today}`,
          { method: "DELETE" },
        )
        if (!r.ok) {
          const b = await r.json().catch(() => null)
          throw new Error(b?.error || "Gagal")
        }
        flash("Izin dibatalkan")
      } else {
        // Saat tandai izin, lepas centang bayar
        setPicked((prev) => {
          const n = new Set(prev)
          n.delete(id)
          return n
        })
        const r = await fetch("/api/kas/izin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentIds: [id], date: today }),
        })
        const b = await r.json().catch(() => null)
        if (!r.ok) throw new Error(b?.error || "Gagal")
        flash("Ditandai sebagai izin")
      }
      await Promise.all([mutateIzin(), mutate(), mutateTunggak()])
    } catch (e) {
      flash(e instanceof Error ? e.message : "Gagal")
    }
  }

  const saveSpecial = async () => {
    setErr(null)
    const n = Number(spAmount)
    const name = list.find((s) => s.id === spStudent)?.full_name
    if (!spStudent || !Number.isFinite(n) || n <= 0) {
      setErr("Pilih siswa dan isi nominal")
      return
    }
    setSavingSp(true)
    try {
      const kali = Math.round(n / NOMINAL)
      const note = spNote.trim() || (kali > 1 ? `Bayar ${kali}x` : "Bayar Khusus")
      const r = await fetch("/api/kas/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "IN",
          category: "Iuran khusus",
          description: `${name} · ${note}`,
          amount: n,
        }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || `Gagal (${r.status})`)
      setOpenSpecial(false)
      setSpStudent("")
      setSpNote("")
      setSpAmount("20000")
      flash(`${name} · ${formatIDR(n)} tercatat`)
      await mutate()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal")
    } finally {
      setSavingSp(false)
    }
  }

  const saveOut = async () => {
    setErr(null)
    const n = Number(outAmount)
    if (!outNote.trim() || !Number.isFinite(n) || n <= 0) {
      setErr("Keterangan dan nominal wajib diisi")
      return
    }
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
        }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || `Gagal (${r.status})`)
      setOpenOut(false)
      setOutAmount("")
      setOutNote("")
      flash("Pengeluaran tercatat")
      await mutate()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal")
    } finally {
      setSavingOut(false)
    }
  }

  return (
    <div className="px-4 py-3 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-ink">Kas Kelas</h1>
          <p className="text-xs text-ink-soft/75">
            {canManage
              ? "Centang siswa yang sudah membayar"
              : "Hanya dapat dilihat — pengelolaan oleh Bendahara & Wali Kelas"}
          </p>
        </div>
        <Link
          href="/app/kas/buku"
          className="flex items-center gap-1.5 bg-white border border-line shadow-sm text-forest text-xs font-bold px-2.5 py-2 rounded-xl active:scale-[0.95] transition-transform shrink-0"
        >
          <BookOpen className="h-4 w-4" />
          Buku Kas
        </Link>
      </div>

      {error ? (
        <EmptyState icon={<Inbox className="h-6 w-6" />} message="Gagal memuat kas" />
      ) : (
        <>
          {/* Saldo + tombol aksi sejajar (aksi hanya manage) */}
          <div className="flex items-stretch gap-2">
            <div className={`bg-deep rounded-2xl p-3.5 text-white flex flex-col justify-between ${canManage ? "w-[60%]" : "w-full"}`}>
              <div>
                <span className="flex items-center gap-1.5 text-xs font-medium text-white/70">
                  <Wallet className="h-3.5 w-3.5" />
                  Saldo Kas
                </span>
                <p className="mt-1.5 text-2xl font-bold leading-none text-acid">
                  {formatIDR(data?.balance ?? 0)}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-lime/15 border border-lime/30 px-2 py-0.5 text-[11px] font-semibold text-lime">
                    + {formatIDR(data?.monthIn ?? 0)} Masuk
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber/15 border border-amber/30 px-2 py-0.5 text-[11px] font-semibold text-amber">
                    − {formatIDR(data?.monthOut ?? 0)} Keluar
                  </span>
                </div>
              </div>
              {data?.lastActivity && (
                <p className="mt-2 text-[11px] text-white/45 truncate border-t border-white/10 pt-2">
                  {data.lastActivity.by} · {whenShort(data.lastActivity.at)}
                </p>
              )}
            </div>

            {canManage && (
              <div className="w-[40%] flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setOpenSpecial(true)}
                  className="flex-1 rounded-2xl bg-white border border-line shadow-sm px-2.5 flex items-center gap-2 active:scale-[0.97] transition-transform"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest/10 text-forest shrink-0">
                    <Coins className="h-4 w-4" />
                  </span>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block text-xs font-semibold text-ink leading-tight whitespace-nowrap">
                      Bayar Khusus
                    </span>
                    <span className="block text-[11px] text-ink-soft/55 leading-tight mt-0.5 whitespace-nowrap">
                      Nominal Bebas
                    </span>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setOpenOut(true)}
                  className="flex-1 rounded-2xl bg-white border border-line shadow-sm px-2.5 flex items-center gap-2 active:scale-[0.97] transition-transform"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-alert/10 text-alert shrink-0">
                    <ReceiptText className="h-4 w-4" />
                  </span>
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block text-xs font-semibold text-ink leading-tight whitespace-nowrap">
                      Pengeluaran
                    </span>
                    <span className="block text-[11px] text-ink-soft/55 leading-tight mt-0.5 whitespace-nowrap">
                      ATK, cetak, dll
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
                <p className="text-xs text-ink-soft/70">Iuran saya bulan ini</p>
                <p className="mt-0.5 text-sm font-bold text-forest tabular-nums">
                  {data?.myPaid != null && data.myPaid > 0
                    ? formatIDR(data.myPaid)
                    : "Belum tercatat"}
                </p>
              </div>
              {data?.month && (
                <p className="text-[11px] text-ink-soft/55 text-right shrink-0">
                  {data.month.title}
                  <br />
                  {formatIDR(data.month.amount)}/orang
                </p>
              )}
            </div>
          )}

          {canManage && (
            <div className="bg-white border border-line shadow-sm rounded-2xl overflow-hidden">
              <div className="px-3.5 pt-3.5 pb-2 bg-page/60 border-b border-line">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-ink">Setoran Hari Ini</p>
                    <p className="text-xs text-ink-soft/70 mt-0.5">
                      {todayLabel()} · {formatIDR(NOMINAL)}/orang
                    </p>
                  </div>
                  {collectionDay && (
                    <span className="text-[11px] font-bold uppercase tracking-wide bg-forest text-white px-2 py-1 rounded-full">
                      Hari setoran
                    </span>
                  )}
                </div>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <div className="flex gap-1 bg-white border border-line rounded-lg p-0.5">
                    <button
                      type="button"
                      onClick={() => setMarkMode("bayar")}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                        markMode === "bayar" ? "bg-forest text-white" : "text-ink-soft"
                      }`}
                    >
                      Bayar
                    </button>
                    <button
                      type="button"
                      onClick={() => setMarkMode("izin")}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                        markMode === "izin" ? "bg-amber text-white" : "text-ink-soft"
                      }`}
                    >
                      Izin
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-forest">
                      {totalPick} · {markMode === "izin" ? "izin" : formatIDR(totalRupiah)}
                    </p>
                    <button
                      type="button"
                      onClick={selectAll}
                      className="text-xs font-semibold px-2 py-1 rounded-lg bg-white border border-line text-ink"
                    >
                      Semua
                    </button>
                    <button
                      type="button"
                      onClick={() => void clearAll()}
                      disabled={saving}
                      className="text-xs font-semibold px-2 py-1 rounded-lg bg-white border border-line text-ink-soft disabled:opacity-50"
                    >
                      {markMode === "izin" ? "Hapus Izin" : "Kosongkan"}
                    </button>
                  </div>
                </div>
              </div>

              {err && (
                <p className="px-3.5 py-2 text-xs text-alert bg-alert-bg">{err}</p>
              )}

              {/* Tabel: No | Nama | Bayar | Izin */}
              <div>
                <div className="flex items-center gap-2 px-2.5 py-1.5 bg-page/80 border-b border-line text-[11px] font-medium uppercase tracking-wide text-ink-soft/60">
                  <span className="w-6 text-center shrink-0">No</span>
                  <span className="flex-1 min-w-0">Nama</span>
                  <span className="w-12 text-center shrink-0">Bayar</span>
                  <span className="w-12 text-center shrink-0">Izin</span>
                </div>
                {list.length === 0 ? (
                  <p className="p-5 text-center text-xs text-ink-soft/60">
                    Memuat daftar siswa…
                  </p>
                ) : (
                  <div className="divide-y divide-line/40">
                    {list.map((s, i) => {
                      const on = picked.has(s.id)
                      const izin = izinIds.has(s.id)
                      const bayarMode = markMode === "bayar"
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            if (bayarMode) toggle(s.id)
                            else void toggleIzin(s.id)
                          }}
                          className={`flex items-center gap-2 px-2.5 py-2.5 cursor-pointer transition-colors ${
                            bayarMode
                              ? on
                                ? "bg-forest/8"
                                : izin
                                  ? "bg-amber/5 opacity-60"
                                  : "bg-white"
                              : izin
                                ? "bg-amber/10"
                                : on
                                  ? "bg-forest/5 opacity-50"
                                  : "bg-white"
                          }`}
                        >
                          <span className="w-6 text-center text-[11px] font-medium text-ink-soft/50 tabular-nums shrink-0">
                            {i + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p
                              className={`text-sm font-semibold truncate ${
                                bayarMode && on
                                  ? "text-forest"
                                  : izin
                                    ? "text-amber-800"
                                    : "text-ink"
                              }`}
                            >
                              {formatDisplayName(s.full_name)}
                            </p>
                            {(() => {
                              if (!tunggak) return null
                              const t = tunggakByName.get(s.full_name.toLowerCase())
                              if (t && t.tunggak > 0) {
                                return (
                                  <p className="mt-0.5 text-[11px] text-ink-soft/70">
                                    Hutang:{" "}
                                    <span className="font-semibold text-alert">
                                      {formatIDR(t.tunggak)}
                                    </span>{" "}
                                    / {formatIDR(t.expected)}
                                  </p>
                                )
                              }
                              return (
                                <p className="mt-0.5 text-[11px] text-forest/70 flex items-center gap-1">
                                  <Check className="h-3 w-3" />
                                  Lunas
                                </p>
                              )
                            })()}
                          </div>
                          <div className="w-12 shrink-0 flex justify-center">
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                                !bayarMode
                                  ? "bg-surface border-line/60 text-transparent opacity-40"
                                  : on
                                    ? "bg-forest border-forest text-white"
                                    : "bg-white border-line text-transparent"
                              }`}
                            >
                              <Check className="h-3.5 w-3.5" strokeWidth={3} />
                            </span>
                          </div>
                          <div className="w-12 shrink-0 flex justify-center">
                            <span
                              className={`flex h-5 w-5 items-center justify-center rounded border text-[11px] font-bold ${
                                bayarMode
                                  ? "bg-surface border-line/60 text-transparent opacity-40"
                                  : izin
                                  ? "bg-amber text-white border-amber"
                                  : "bg-white border-line text-transparent"
                            }`}
                          >
                            ✓
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
                    ? "Menyimpan…"
                    : totalPick === 0
                      ? markMode === "izin"
                        ? "Centang siswa yang izin"
                        : "Centang siswa yang sudah membayar"
                      : markMode === "izin"
                        ? `Simpan ${totalPick} izin`
                        : `Simpan ${totalPick} setoran · ${formatIDR(totalRupiah)}`}
                </button>
              </div>
            </div>
          )}

          {/* Ringkasan tunggak — detail di bawah nama */}
          {canManage && tunggak && (tunggak.rows?.length ?? 0) > 0 && (
            <div className="flex items-center gap-2 rounded-xl bg-alert/8 border border-alert/15 px-3 py-2">
              <AlertTriangle className="h-3.5 w-3.5 text-alert shrink-0" />
              <p className="text-xs text-ink-soft/70 flex-1 min-w-0">
                {tunggak.rows.length} siswa masih memiliki tunggak · kumulatif semester
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
        title="Detail transaksi"
      >
        {detailTx && (
          <div className="space-y-3">
            <div
              className={`rounded-xl p-3 flex items-center justify-between ${
                detailTx.kind === "IN" ? "bg-ok-bg" : "bg-alert-bg"
              }`}
            >
              <div>
                <p className="text-xs font-semibold text-ink-soft/70 uppercase">
                  {detailTx.kind === "IN" ? "Masuk" : "Keluar"}
                </p>
                <p className="text-xs text-ink-soft">{detailTx.category}</p>
              </div>
              <p
                className={`text-lg font-black ${
                  detailTx.kind === "IN" ? "text-forest" : "text-alert"
                }`}
              >
                {detailTx.kind === "IN" ? "+" : "−"}
                {formatIDR(detailTx.amount)}
              </p>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-3">
                <span className="text-ink-soft">Keterangan</span>
                <span className="font-semibold text-ink text-right flex-1">
                  {detailTx.description || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink-soft">Dicatat oleh</span>
                <span className="font-semibold text-ink text-right flex-1">
                  {actorName(
                    detailTx.recorded_by,
                    session?.user?.name ?? undefined,
                    session?.user?.email ?? undefined,
                  )}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink-soft">Tanggal catat</span>
                <span className="font-semibold text-ink text-right flex-1">
                  {whenShort(detailTx.created_at)}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-ink-soft">Tanggal kejadian</span>
                <span className="font-semibold text-ink text-right flex-1">
                  {formatDateID(new Date(detailTx.occurred_on))}
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
        title="Bayar Khusus"
      >
        {err && (
          <p className="text-xs text-alert bg-alert-bg border border-alert/20 rounded-xl px-3 py-2">
            {err}
          </p>
        )}
        <Field label="Siswa">
          <select
            value={spStudent}
            onChange={(e) => {
              const id = e.target.value
              setSpStudent(id)
              const name = list.find((s) => s.id === id)?.full_name
              const t = name
                ? (tunggak?.all ?? []).find(
                    (r) => r.name.toLowerCase() === name.toLowerCase(),
                  )
                : undefined
              if (t && t.tunggak > 0) {
                setSpAmount(String(t.tunggak))
                if (!spNote) setSpNote("Lunas tunggak semester")
              }
            }}
            className={inputClass}
          >
            <option value="">Pilih Siswa…</option>
            {list.map((s) => {
              const t = tunggakByName.get(s.full_name.toLowerCase())
              const badge = t && t.tunggak > 0 ? ` — tunggak ${formatIDR(t.tunggak)}` : ""
              return (
                <option key={s.id} value={s.id}>
                  {formatDisplayName(s.full_name)}
                  {badge}
                </option>
              )
            })}
          </select>
        </Field>

        {/* Ringkasan utang siswa terpilih */}
        {(() => {
          const name = list.find((s) => s.id === spStudent)?.full_name
          const t = name
            ? (tunggak?.all ?? []).find(
                (r) => r.name.toLowerCase() === name.toLowerCase(),
              )
            : undefined
          if (!spStudent || !t) return null
          return (
            <div
              className={`rounded-xl border px-3 py-2.5 ${
                t.tunggak > 0
                  ? "bg-alert/8 border-alert/20"
                  : "bg-ok-bg/50 border-forest/20"
              }`}
            >
              <p className="text-sm font-semibold text-ink mb-1.5">
                {formatDisplayName(t.name)}
              </p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[11px] text-ink-soft/55">Wajib</p>
                  <p className="text-xs font-semibold text-ink tabular-nums">
                    {formatIDR(t.expected)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-ink-soft/55">Sudah Membayar</p>
                  <p className="text-xs font-semibold text-forest tabular-nums">
                    {formatIDR(t.paid)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-ink-soft/55">Sisa Tunggak</p>
                  <p
                    className={`text-xs font-semibold tabular-nums ${
                      t.tunggak > 0 ? "text-alert" : "text-forest"
                    }`}
                  >
                    {t.tunggak > 0 ? formatIDR(t.tunggak) : "Lunas ✓"}
                  </p>
                </div>
              </div>
              {t.tunggak > 0 && (
                <button
                  type="button"
                  onClick={() => setSpAmount(String(t.tunggak))}
                  className="mt-2 w-full text-xs font-semibold text-forest py-1 rounded-lg border border-forest/30"
                >
                  Gunakan sisa tunggak ({formatIDR(t.tunggak)})
                </button>
              )}
            </div>
          )
        })()}
        <div className="space-y-1">
          <span className="text-sm font-semibold text-ink">Nominal</span>
          <div className="grid grid-cols-4 gap-1.5">
            {[2000, 10000, 20000, 50000].map((n) => (
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
        <Field label="Jumlah (Rp)">
          <input
            type="number"
            inputMode="numeric"
            min={2000}
            step={1000}
            value={spAmount}
            onChange={(e) => setSpAmount(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Catatan (opsional)" hint="Mis. bayar 10× / numpuk">
          <input
            value={spNote}
            onChange={(e) => setSpNote(e.target.value)}
            className={inputClass}
            placeholder="Bayar 10×"
          />
        </Field>
        {Number(spAmount) > 0 && spStudent && (
          <p className="text-xs font-semibold text-forest">
            ≈ {Math.round(Number(spAmount) / NOMINAL)}× setoran harian
          </p>
        )}
        <button
          type="button"
          disabled={savingSp || !spStudent || !spAmount}
          onClick={() => void saveSpecial()}
          className="w-full bg-forest text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50"
        >
          {savingSp ? "Menyimpan…" : "Simpan Bayar Khusus"}
        </button>
      </Sheet>

      {/* Pengeluaran minimal */}
      <Sheet open={openOut} onClose={() => setOpenOut(false)} title="Pengeluaran">
        {err && (
          <p className="text-xs text-alert bg-alert-bg border border-alert/20 rounded-xl px-3 py-2">
            {err}
          </p>
        )}
        <Field label="Keterangan">
          <input
            value={outNote}
            onChange={(e) => setOutNote(e.target.value)}
            className={inputClass}
            placeholder="Beli kapur / spidol…"
          />
        </Field>
        <Field label="Jumlah (Rp)">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            value={outAmount}
            onChange={(e) => setOutAmount(e.target.value)}
            className={inputClass}
            placeholder="5000"
          />
        </Field>
        <button
          type="button"
          disabled={savingOut}
          onClick={() => void saveOut()}
          className="w-full bg-forest text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50"
        >
          {savingOut ? "Menyimpan…" : "Simpan"}
        </button>
      </Sheet>

      <div className="h-2" />
    </div>
  )
}
