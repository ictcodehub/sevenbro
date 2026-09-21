"use client"

import { useSession, signOut } from "next-auth/react"
import { useState } from "react"
import {
  Check,
  QrCode,
  Shield,
  Sparkles,
  User,
  Zap,
  ArrowDownRight,
} from "lucide-react"
import { EmptyState } from "@/components/ui-primitives"
import { useAppSWR } from "@/lib/fetcher"
import { Sheet, Field, inputClass } from "@/components/ui/sheet"
import { canGivePoints } from "@/lib/policies"
import { RoleGate } from "@/components/RoleGate"
import { formatDisplayName } from "@/lib/format"
import { formatRoleLabel } from "@/lib/roles"
import { clearSwrCache } from "@/lib/swr-store"
import { useT } from "@/lib/i18n"

type LeaderRow = {
  student_id: string
  full_name: string
  position: string
  total_points: number
}

type PointsPayload = {
  leaderboard: LeaderRow[]
}

type StudentOpt = { id: string; full_name: string; position: string }

const AMOUNTS = [5, 10, 20]

/**
 * Scan to Give Point — dipanggil via QR di kelas.
 * Hanya HOMEROOM / TEACHER. UI minimal: pilih siswa → prestasi/pelanggaran → alasan.
 */
export default function ScanPage() {
  return (
    <RoleGate allow={["HOMEROOM", "TEACHER"]}>
      <ScanInner />
    </RoleGate>
  )
}

function ScanInner() {
  const { data: session, status } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const canGive = canGivePoints(role ?? "")
  const { data, mutate } = useAppSWR<PointsPayload>(canGive ? "/api/points" : null)
  const { data: students } = useAppSWR<StudentOpt[]>(
    canGive ? "/api/admin/students" : null,
  )

  const [studentId, setStudentId] = useState("")
  const [kind, setKind] = useState<"PRESTASI" | "PELANGGARAN">("PRESTASI")
  const [amount, setAmount] = useState(5)
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [lastSaved, setLastSaved] = useState<string | null>(null)
  const t = useT()

  if (status === "loading") {
    return (
      <div className="px-4 py-3">
        <p className="text-xs text-ink-soft/75">{t("common.loading")}</p>
      </div>
    )
  }

  if (!canGive) {
    return (
      <div className="px-4 py-3">
        <EmptyState
          icon={<Shield className="h-6 w-6" />}
          message={t("scan.onlyTeachers")}
        />
      </div>
    )
  }

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const submit = async () => {
    setErr(null)
    if (!studentId || !reason.trim()) {
      setErr("Pilih siswa dan isi alasan")
      return
    }
    setSaving(true)
    try {
      const r = await fetch("/api/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, kind, delta: amount, reason: reason.trim() }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || t("common.failedWithStatus", { status: r.status }))
      const name = students?.find((s) => s.id === studentId)?.full_name ?? t("poin.student")
      setLastSaved(
        t("scan.lastSaved", { sign: kind === "PRESTASI" ? "+" : "−", amount, name }),
      )
      setReason("")
      setStudentId("")
      flash(t("poin.saved"))
      await mutate()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="px-4 py-3 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-forest/70">
            {t("scan.mode")}
          </p>
          <h1 className="text-lg font-bold text-ink">{t("poin.give")}</h1>
          <p className="text-xs text-ink-soft/75">
            {formatDisplayName(session?.user?.name)} · {formatRoleLabel(role)}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest/10 text-forest">
          <QrCode className="h-5 w-5" />
        </div>
      </div>

      {lastSaved && (
        <div className="rounded-xl border border-lime/40 bg-lime-soft/40 px-3 py-2 text-xs font-semibold text-forest">
          {t("scan.lastSavedLabel")} {lastSaved}
        </div>
      )}

      {err && (
        <p className="text-xs text-alert bg-alert-bg border border-alert/20 rounded-xl px-3 py-2">
          {err}
        </p>
      )}

      <Field label={t("poin.student")}>
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className={inputClass}
        >
          <option value="">{t("scan.pickStudent")}</option>
          {(students ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {formatDisplayName(s.full_name)}
              {s.position !== "ANGGOTA" ? ` (${s.position})` : ""}
            </option>
          ))}
        </select>
      </Field>

      {studentId && (
        <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
          <User className="h-4 w-4 text-forest shrink-0" />
          <p className="text-sm font-semibold text-ink truncate">
            {students?.find((s) => s.id === studentId)?.full_name}
          </p>
        </div>
      )}

      <div className="space-y-1">
        <span className="text-sm font-semibold text-ink">{t("scan.kind")}</span>
        <div className="grid grid-cols-2 gap-2">
          {(["PRESTASI", "PELANGGARAN"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-xl py-3 text-sm font-bold border transition ${
                kind === k
                  ? k === "PRESTASI"
                    ? "bg-forest text-white border-forest"
                    : "bg-alert text-white border-alert"
                  : "bg-white text-ink border-line"
              }`}
            >
              {k === "PRESTASI" ? (
                <span className="flex items-center justify-center gap-1">
                  <Zap className="h-4 w-4" /> {t("poin.prestasi")}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1">
                  <ArrowDownRight className="h-4 w-4" /> {t("poin.pelanggaran")}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-sm font-semibold text-ink">{t("poin.title")}</span>
        <div className="grid grid-cols-3 gap-2">
          {AMOUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAmount(n)}
              className={`rounded-xl py-3 text-sm font-black border transition ${
                amount === n
                  ? "bg-amber text-deep border-amber shadow"
                  : "bg-white text-ink border-line"
              }`}
            >
              {kind === "PRESTASI" ? "+" : "−"}
              {n}
            </button>
          ))}
        </div>
      </div>

      <Field label={t("poin.reason")} hint={t("scan.reasonHint")}>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={
            kind === "PRESTASI"
              ? t("scan.phGood")
              : t("scan.phBad")
          }
          className={inputClass + " resize-none scroll-y-only"}
        />
      </Field>

      <button
        type="button"
        disabled={saving || !studentId || !reason.trim()}
        onClick={() => void submit()}
        className="w-full bg-forest text-white text-sm font-black py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98]"
      >
        <Check className="h-5 w-5" />
        {saving ? t("kas.saving") : t("scan.savePoints")}
      </button>

      {(data?.leaderboard?.length ?? 0) > 0 && (
        <p className="text-xs text-ink-soft/50 text-center">
          {t("scan.registered", { n: data!.leaderboard.length })}
        </p>
      )}

      <button
        type="button"
        onClick={() => {
          clearSwrCache()
          void signOut({ callbackUrl: "/login" })
        }}
        className="w-full text-xs font-semibold text-ink-soft py-2"
      >
        {t("scan.signOut")}
      </button>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-lime text-deep text-sm font-black px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="h-2" />
    </div>
  )
}
