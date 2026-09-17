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

  if (status === "loading") {
    return (
      <div className="px-4 py-3">
        <p className="text-[11px] text-ink-soft/75">Memuat…</p>
      </div>
    )
  }

  if (!canGive) {
    return (
      <div className="px-4 py-3">
        <EmptyState
          icon={<Shield className="h-6 w-6" />}
          message="Fitur ini hanya untuk guru dan wali kelas"
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
      if (!r.ok) throw new Error(b?.error || `Gagal (${r.status})`)
      const name = students?.find((s) => s.id === studentId)?.full_name ?? "Siswa"
      setLastSaved(
        `${kind === "PRESTASI" ? "+" : "−"}${amount} → ${name}`,
      )
      setReason("")
      setStudentId("")
      flash("Poin berhasil disimpan.")
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
          <p className="text-[10px] font-bold uppercase tracking-widest text-forest/70">
            Scan Mode
          </p>
          <h1 className="text-lg font-bold text-ink">Beri Poin</h1>
          <p className="text-[11px] text-ink-soft/75">
            {session?.user?.name} · {role}
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest/10 text-forest">
          <QrCode className="h-5 w-5" />
        </div>
      </div>

      {lastSaved && (
        <div className="rounded-xl border border-lime/40 bg-lime-soft/40 px-3 py-2 text-[11px] font-semibold text-forest">
          Terakhir: {lastSaved}
        </div>
      )}

      {err && (
        <p className="text-[11px] text-alert bg-alert-bg border border-alert/20 rounded-xl px-3 py-2">
          {err}
        </p>
      )}

      <Field label="Siswa">
        <select
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          className={inputClass}
        >
          <option value="">Pilih siswa…</option>
          {(students ?? []).map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
              {s.position !== "ANGGOTA" ? ` (${s.position})` : ""}
            </option>
          ))}
        </select>
      </Field>

      {studentId && (
        <div className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2">
          <User className="h-4 w-4 text-forest shrink-0" />
          <p className="text-[11px] font-semibold text-ink truncate">
            {students?.find((s) => s.id === studentId)?.full_name}
          </p>
        </div>
      )}

      <div className="space-y-1">
        <span className="text-[11px] font-semibold text-ink">Jenis</span>
        <div className="grid grid-cols-2 gap-2">
          {(["PRESTASI", "PELANGGARAN"] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={`rounded-xl py-3 text-[12px] font-bold border transition ${
                kind === k
                  ? k === "PRESTASI"
                    ? "bg-forest text-white border-forest"
                    : "bg-alert text-white border-alert"
                  : "bg-white text-ink border-line"
              }`}
            >
              {k === "PRESTASI" ? (
                <span className="flex items-center justify-center gap-1">
                  <Zap className="h-4 w-4" /> Prestasi
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1">
                  <ArrowDownRight className="h-4 w-4" /> Pelanggaran
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-[11px] font-semibold text-ink">Poin</span>
        <div className="grid grid-cols-3 gap-2">
          {AMOUNTS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setAmount(n)}
              className={`rounded-xl py-3 text-[14px] font-black border transition ${
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

      <Field label="Alasan" hint="Wajib — muncul di riwayat kelas">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder={
            kind === "PRESTASI"
              ? "Membantu teman…"
              : "Terlambat / tidak nurut…"
          }
          className={inputClass + " resize-none"}
        />
      </Field>

      <button
        type="button"
        disabled={saving || !studentId || !reason.trim()}
        onClick={() => void submit()}
        className="w-full bg-forest text-white text-[13px] font-black py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98]"
      >
        <Check className="h-5 w-5" />
        {saving ? "Menyimpan…" : "Simpan Poin"}
      </button>

      {(data?.leaderboard?.length ?? 0) > 0 && (
        <p className="text-[9px] text-ink-soft/50 text-center">
          {data!.leaderboard.length} siswa terdaftar · kelas aktif
        </p>
      )}

      <button
        type="button"
        onClick={() => void signOut({ callbackUrl: "/login" })}
        className="w-full text-[11px] font-semibold text-ink-soft py-2"
      >
        Keluar
      </button>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-lime text-deep text-[12px] font-black px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="h-2" />
    </div>
  )
}
