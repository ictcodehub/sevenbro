"use client"

import { useCallback, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Camera, Check, X, Flag } from "lucide-react"
import { loadPrefs, showBrowserNotification } from "@/lib/prefs"
import { formatDisplayName } from "@/lib/format"
import { canReviewMassReport } from "@/lib/policies"

type ReportRow = {
  id: string
  reason: string
  delta: number
  note: string | null
  target_names: string[]
  status: "VOTING" | "READY" | "APPROVED" | "REJECTED" | "CLOSED"
  isTarget?: boolean
  isCreator?: boolean
  iVoted?: boolean
  iChoice?: string | null
  hasPhoto?: boolean
  created_by_name?: string | null
  voteCount?: number
  yesCount?: number
  noCount?: number
  threshold?: number
}

type Payload = { reports: ReportRow[] }

const DISMISS_KEY = "sevenbro:report-dismissed"

function dismissId(id: string) {
  try {
    const list = JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]") as string[]
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...list, id]))
  } catch {}
}

export default function MassReportVoteModal() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const router = useRouter()
  const isReviewRole = canReviewMassReport(role ?? "")
  const [current, setCurrent] = useState<ReportRow | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [photoErr, setPhotoErr] = useState<string | null>(null)
  const [voted, setVoted] = useState<"YES" | "NO" | null>(null)
  const [saving, setSaving] = useState(false)
  const [voteErr, setVoteErr] = useState<string | null>(null)

  const pick = useCallback(
    (reports: ReportRow[]) => {
      let dismissed: string[] = []
      try {
        dismissed = JSON.parse(localStorage.getItem(DISMISS_KEY) || "[]") as string[]
      } catch {}
      if (isReviewRole) {
        // Homeroom: modal review saat laporan siap ditinjau
        return (
          reports.find((r) => r.status === "READY" && !dismissed.includes(r.id)) ?? null
        )
      }
      return (
        reports.find(
          (r) =>
            r.status === "VOTING" &&
            !r.isTarget &&
            !r.isCreator &&
            !r.iVoted &&
            !dismissed.includes(r.id),
        ) ?? null
      )
    },
    [isReviewRole],
  )

  const refresh = useCallback(async () => {
    if (!role) return
    if (role === "TEACHER" || role === "PENDING") return
    try {
      const r = await fetch("/api/mass-reports", { headers: { Accept: "application/json" } })
      if (!r.ok) return
      const b = (await r.json()) as Payload
      if (!Array.isArray(b?.reports)) return
      setCurrent((prev) => prev ?? pick(b.reports))
    } catch {}
  }, [role, pick])

  useEffect(() => {
    void refresh()
    const t = setInterval(() => void refresh(), 20000)
    const onFocus = () => void refresh()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(t)
      window.removeEventListener("focus", onFocus)
    }
  }, [refresh])

  const closeQuiet = () => {
    if (!current) return
    dismissId(current.id)
    setCurrent(null)
    setPhotoOpen(false)
    setPhotoUrl(null)
    setVoteErr(null)
    setVoted(null)
  }

  useEffect(() => {
    if (!current) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeQuiet()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current])

  const openPhoto = async (id: string) => {
    setPhotoErr(null)
    try {
      const r = await fetch(`/api/mass-reports/${encodeURIComponent(id)}`)
      if (!r.ok) throw new Error()
      const b = await r.json()
      const raw = String(b.data || "")
      if (!raw) throw new Error()
      setPhotoUrl(raw.startsWith("data:") ? raw : `data:${b.mime || "image/jpeg"};base64,${raw}`)
      setPhotoOpen(true)
    } catch {
      setPhotoErr("Foto tidak tersedia. Pastikan perangkat terhubung jaringan kelas.")
    }
  }

  const submitVote = async (choice: "YES" | "NO") => {
    if (!current || saving) return
    setSaving(true)
    setVoteErr(null)
    try {
      const r = await fetch(`/api/mass-reports/${current.id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || "Vote gagal. Coba lagi.")
      setVoted(choice)
      dismissId(current.id)
      const targets = current.target_names.join(", ")
      const msg =
        choice === "YES"
          ? `Anda menyetujui vote untuk ${targets}.`
          : `Anda tidak menyetujui vote untuk ${targets}.`
      if (loadPrefs().push) showBrowserNotification("Hasil vote", msg)
      setTimeout(closeQuiet, 1500)
    } catch (e) {
      setVoteErr(e instanceof Error ? e.message : "Vote gagal. Coba lagi.")
    } finally {
      setSaving(false)
    }
  }

  if (!current) return null

  const pointBadge = (
    <span className="shrink-0 rounded-md bg-[#EEA34C]/15 border border-[#EEA34C]/45 px-2 py-0.5 text-[10px] font-bold text-[#EEA34C] tabular-nums">
      −{current.delta} poin
    </span>
  )

  const header = (
    <div className="bg-deep text-white px-4 pt-4 pb-3.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium text-white/55">
            {isReviewRole ? "Mass Report · Review" : "Mass Report · Vote Kelas"}
          </p>
          <h2
            id="mass-report-title"
            className="mt-1 text-[15px] font-bold leading-snug text-white"
          >
            {current.reason}
          </h2>
        </div>
        <button
          type="button"
          onClick={closeQuiet}
          aria-label="Tutup laporan"
          className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/80 active:opacity-70"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-white/8 border border-white/10 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[9px] font-medium text-white/50 uppercase tracking-wide">
            Target
          </p>
          <p className="mt-0.5 text-[12px] font-semibold text-white truncate">
            {current.target_names.join(", ")}
          </p>
        </div>
        {pointBadge}
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Tutup"
        onClick={closeQuiet}
        className="absolute inset-0 bg-ink/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mass-report-title"
        className="relative w-full max-w-sm max-h-[90vh] flex flex-col rounded-2xl bg-white border border-line shadow-lg overflow-hidden"
      >
        {header}

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {current.note && (
            <div className="rounded-xl border-2 border-dashed border-forest/30 bg-page/60 px-3 py-2.5">
              <p className="text-[11px] font-semibold text-forest leading-relaxed whitespace-pre-wrap">
                {current.note}
              </p>
            </div>
          )}

          {current.created_by_name && (
            <p className="text-[10px] text-ink-soft/60">
              Dilaporkan oleh {formatDisplayName(current.created_by_name)}
            </p>
          )}

          {isReviewRole && (
            <div className="rounded-xl bg-page border border-line px-3 py-2.5">
              <p className="text-[10px] font-medium text-ink-soft/60">Vote masuk</p>
              <p className="mt-0.5 text-[12px] font-semibold text-ink">
                {current.voteCount ?? 0} total ·{" "}
                <span className="text-forest">{current.yesCount ?? 0} setuju</span>
                {" · "}
                <span className="text-alert">{current.noCount ?? 0} tidak</span>
              </p>
              <p className="mt-0.5 text-[9px] text-ink-soft/50">
                Cukup {current.threshold ?? 10} vote untuk siap ditinjau
              </p>
            </div>
          )}

          {current.hasPhoto && (
            <button
              type="button"
              onClick={() => void openPhoto(current.id)}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-line bg-page px-3 py-2.5 text-[11px] font-semibold text-forest active:scale-[0.98] transition-transform"
            >
              <Camera className="h-4 w-4" />
              Lihat Foto Bukti
            </button>
          )}

          {photoErr && (
            <p className="text-[11px] text-alert bg-alert-bg border border-alert/15 rounded-xl px-3 py-2">
              {photoErr}
            </p>
          )}

          {voteErr && (
            <p className="text-[11px] text-alert bg-alert-bg border border-alert/15 rounded-xl px-3 py-2">
              {voteErr}
            </p>
          )}
        </div>

        <div className="px-4 pb-4 pt-1">
          {isReviewRole ? (
            <button
              type="button"
              onClick={() => {
                dismissId(current.id)
                router.push("/app/poin")
              }}
              className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-forest text-white text-[12px] font-bold py-3 active:scale-[0.98] transition-transform"
            >
              <Flag className="h-4 w-4" />
              Buka Panel Review
            </button>
          ) : voted ? (
            <div className="rounded-xl bg-ok-bg border border-forest/15 px-3 py-3 text-center">
              <p className="text-[12px] font-semibold text-forest">
                {voted === "YES"
                  ? "Anda menyetujui vote ini"
                  : "Anda tidak menyetujui vote ini"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void submitVote("YES")}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-forest text-white text-[12px] font-bold py-3 active:scale-[0.98] disabled:opacity-45 transition-transform"
              >
                <Check className="h-4 w-4" />
                Setuju
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void submitVote("NO")}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-page border border-line text-ink text-[12px] font-bold py-3 active:scale-[0.98] disabled:opacity-45 transition-transform"
              >
                Tidak Setuju
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox foto — center layar, di atas modal vote */}
      {photoOpen && photoUrl && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Foto bukti"
        >
          <button
            type="button"
            aria-label="Tutup foto"
            onClick={() => setPhotoOpen(false)}
            className="absolute inset-0 bg-ink/70"
          />
          <div className="relative z-10 flex flex-col items-center gap-3 max-w-full max-h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt="Bukti"
              className="max-w-full max-h-[75vh] object-contain rounded-xl border border-white/10 shadow-2xl bg-page"
            />
            <button
              type="button"
              onClick={() => setPhotoOpen(false)}
              className="rounded-xl bg-white/95 px-4 py-2 text-[12px] font-semibold text-ink"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
