"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { Check, Flag, X, Image as ImageIcon } from "lucide-react"
import { SectionHeader, EmptyState } from "@/components/ui-primitives"
import { Sheet, inputClass } from "@/components/ui/sheet"
import { formatDisplayName } from "@/lib/format"
import { canReviewMassReport, canCreateMassReport } from "@/lib/policies"
import { useAppSWR } from "@/lib/fetcher"

type ReportRow = {
  id: string
  reason: string
  delta: number
  note: string | null
  target_ids: string[]
  target_names: string[]
  status: "VOTING" | "READY" | "APPROVED" | "REJECTED" | "CLOSED"
  created_by: string
  created_by_name: string | null
  created_at: string
  is_custom?: boolean
  original_reason?: string | null
  hasPhoto?: boolean
  voteCount: number
  yesCount?: number
  noCount?: number
  yesVoters?: string[]
  noVoters?: string[]
  iVoted: boolean
  iChoice?: string | null
  isTarget: boolean
  threshold: number
}

type ListPayload = {
  reports: ReportRow[]
}

const STATUS_LABEL: Record<string, string> = {
  VOTING: "Voting",
  READY: "Siap Review",
  APPROVED: "Diterima",
  REJECTED: "Ditolak",
  CLOSED: "Ditutup",
}

export default function MassReportPanel() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const canReview = canReviewMassReport(role ?? "")
  const canCreate = canCreateMassReport(role ?? "")

  const { data, mutate, error } = useAppSWR<ListPayload>("/api/mass-reports")
  const reports = data?.reports ?? []

  const [editId, setEditId] = useState<string | null>(null)
  const [editReason, setEditReason] = useState("")
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoOpen, setPhotoOpen] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [expandId, setExpandId] = useState<string | null>(null)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [donePage, setDonePage] = useState(0)

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(null), 2500)
  }

  const active = reports.filter((r) => r.status === "VOTING" || r.status === "READY")
  // Riwayat: selalu terbaru di atas
  const done = reports
    .filter((r) => r.status !== "VOTING" && r.status !== "READY")
    .slice()
    .sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0
      return tb - ta
    })
  const detail = reports.find((r) => r.id === detailId) ?? null
  // Riwayat: 15 baris / halaman + navigasi
  const DONE_PAGE_SIZE = 15
  const donePages = Math.max(1, Math.ceil(done.length / DONE_PAGE_SIZE))
  const page = Math.min(donePage, donePages - 1)
  const donePageItems = done.slice(page * DONE_PAGE_SIZE, (page + 1) * DONE_PAGE_SIZE)

  const vote = async (id: string, choice: "YES" | "NO") => {
    try {
      const r = await fetch(`/api/mass-reports/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || "Gagal vote")
      flash(
        choice === "YES"
          ? "Anda menyetujui vote ini"
          : "Anda tidak menyetujui vote ini",
      )
      await mutate()
    } catch (e) {
      flash(e instanceof Error ? e.message : "Gagal")
    }
  }

  const review = async (id: string, decision: "APPROVED" | "REJECTED", reason?: string) => {
    try {
      const r = await fetch(`/api/mass-reports/${id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision, reason }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || "Gagal")
      flash(decision === "APPROVED" ? "Disetujui — poin sudah dikurangi" : "Report ditolak")
      setEditId(null)
      await mutate()
    } catch (e) {
      flash(e instanceof Error ? e.message : "Gagal")
    }
  }

  const openPhoto = async (id: string) => {
    try {
      const r = await fetch(`/api/mass-reports/${id}`)
      if (!r.ok) throw new Error()
      const b = await r.json()
      setPhotoUrl(`data:${b.mime || "image/jpeg"};base64,${b.data.replace(/^data:[^,]+,/, "")}`)
      setPhotoOpen(true)
    } catch {
      flash("Foto tidak tersedia")
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <SectionHeader title="Mass Report" />
        {canCreate && (
          <Link
            href="/app/report/new"
            className="flex items-center gap-1 bg-alert text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-xl active:scale-[0.97] transition-transform shrink-0 mb-2"
          >
            <Flag className="h-3.5 w-3.5" />
            Buat Report
          </Link>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-alert bg-alert-bg border border-alert/20 rounded-xl px-3 py-2">
          Gagal memuat report
        </p>
      )}

      {active.length === 0 && !error ? (
        <EmptyState
          icon={<Flag className="h-6 w-6" />}
          message="Belum ada Mass Report aktif"
        />
      ) : (
        <div className="space-y-2">
          {active.map((r) => {
            const pct = Math.min(100, Math.round((r.voteCount / Math.max(1, r.threshold)) * 100))
            return (
              <div
                key={r.id}
                className="bg-white border border-line shadow-sm rounded-2xl p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-ink truncate">{r.reason}</p>
                    {r.is_custom && r.original_reason && r.original_reason !== r.reason && (
                      <p className="text-[9px] text-ink-soft/50 truncate">
                        Draft ketua: {r.original_reason}
                      </p>
                    )}
                    <p className="text-[10px] mt-0.5 truncate">
                      <span className="text-ink-soft/70">Target: </span>
                      <span className="font-semibold text-forest">
                        {r.target_names.join(", ") || "—"}
                      </span>
                      <span className="text-ink-soft/40"> · </span>
                      <span className="font-bold text-[#EEA34C]">−{r.delta} poin</span>
                    </p>
                    <p className="text-[9px] text-ink-soft/50 mt-1">
                      Oleh {formatDisplayName(r.created_by_name) || r.created_by}
                      {r.hasPhoto ? " · ada foto" : ""}
                    </p>
                  </div>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                      r.status === "READY"
                        ? "bg-amber/15 text-amber-800 border border-amber/30"
                        : "bg-forest/10 text-forest border border-forest/20"
                    }`}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </div>

                {r.note && (
                  <div className="rounded-xl border border-dashed border-[#EEA34C]/50 bg-white px-2.5 py-2">
                    <p className="text-[9px] font-semibold text-[#9a6a20] mb-0.5">Catatan:</p>
                    <p className="text-[11px] text-ink leading-snug whitespace-pre-wrap">
                      {r.note}
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex justify-between text-[9px] text-ink-soft/60">
                    <span>
                      {r.yesCount ?? 0} setuju · {r.noCount ?? 0} tidak · min. {r.threshold ?? 10} vote
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                    <div
                      className="h-full bg-lime rounded-full transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {canReview && (
                  <button
                    type="button"
                    onClick={() => setExpandId(expandId === r.id ? null : r.id)}
                    className="text-[10px] font-semibold text-forest"
                  >
                    {expandId === r.id
                      ? "Sembunyikan detail vote"
                      : `Siapa yang vote (${(r.yesVoters?.length ?? 0) + (r.noVoters?.length ?? 0)})`}
                  </button>
                )}

                {canReview && expandId === r.id && (
                  <div className="rounded-xl border border-line overflow-hidden">
                    <div className="bg-page/80 px-3 py-1.5 border-b border-line flex items-center justify-between">
                      <p className="text-[10px] font-bold text-ink">Detail vote</p>
                      <span className="text-[9px] text-ink-soft/50">
                        {(r.yesVoters?.length ?? 0) + (r.noVoters?.length ?? 0)} orang
                      </span>
                    </div>
                    <div className="grid grid-cols-[2rem_minmax(0,1fr)_2.5rem] gap-2 px-3 py-1.5 bg-page/60 border-b border-line text-[9px] font-medium uppercase tracking-wide text-ink-soft/55">
                      <span className="text-center">No</span>
                      <span className="min-w-0">Nama</span>
                      <span className="text-center">Votes</span>
                    </div>
                    <div className="max-h-48 scroll-y-only divide-y divide-line/40">
                      {(r.yesVoters ?? []).map((name, i) => (
                        <div
                          key={`y-${i}`}
                          className="grid grid-cols-[2rem_minmax(0,1fr)_2.5rem] gap-2 items-center px-3 py-2 min-w-0"
                        >
                          <span className="text-center text-[10px] text-ink-soft/45 tabular-nums">
                            {i + 1}
                          </span>
                          <p className="min-w-0 text-[11px] font-medium text-ink truncate">
                            {name}
                          </p>
                          <span className="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-ok-bg text-forest">
                            <Check className="h-3 w-3" />
                          </span>
                        </div>
                      ))}
                      {(r.noVoters ?? []).map((name, i) => {
                        const n = (r.yesVoters?.length ?? 0) + i
                        return (
                          <div
                            key={`n-${i}`}
                            className="grid grid-cols-[2rem_minmax(0,1fr)_2.5rem] gap-2 items-center px-3 py-2 min-w-0"
                          >
                            <span className="text-center text-[10px] text-ink-soft/45 tabular-nums">
                              {n + 1}
                            </span>
                            <p className="min-w-0 text-[11px] font-medium text-ink truncate">
                              {name}
                            </p>
                            <span className="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-alert-bg text-alert">
                              <X className="h-3 w-3" />
                            </span>
                          </div>
                        )
                      })}
                      {(r.yesVoters?.length || r.noVoters?.length) ? null : (
                        <p className="px-3 py-3 text-[11px] text-ink-soft/60">Belum ada vote</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Aksi: Homeroom review OR siswa vote — tidak tumpuk */}
                <div className="space-y-2">
                  {r.hasPhoto && (
                    <button
                      type="button"
                      onClick={() => void openPhoto(r.id)}
                      className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#9a6a20] bg-[#EEA34C]/12 border border-[#EEA34C]/45 rounded-xl py-2"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      Lihat Bukti
                    </button>
                  )}

                  {canReview ? (
                    (r.status === "READY" || r.status === "VOTING") && (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditId(r.id)
                            setEditReason(r.reason)
                          }}
                          className="flex items-center justify-center gap-1 bg-forest text-white text-[11px] font-semibold py-2.5 rounded-xl"
                        >
                          <Check className="h-3.5 w-3.5" />
                          Terima
                        </button>
                        <button
                          type="button"
                          onClick={() => void review(r.id, "REJECTED")}
                          className="flex items-center justify-center gap-1 bg-page border border-line text-ink text-[11px] font-semibold py-2.5 rounded-xl"
                        >
                          <X className="h-3.5 w-3.5" />
                          Tolak
                        </button>
                      </div>
                    )
                  ) : (
                    <>
                      {r.status === "VOTING" && !r.isTarget && !r.iVoted && (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => void vote(r.id, "YES")}
                            className="flex items-center justify-center gap-1 bg-forest text-white text-[11px] font-semibold py-2.5 rounded-xl"
                          >
                            <Check className="h-3.5 w-3.5" />
                            Setuju
                          </button>
                          <button
                            type="button"
                            onClick={() => void vote(r.id, "NO")}
                            className="flex items-center justify-center gap-1 bg-page border border-line text-ink text-[11px] font-semibold py-2.5 rounded-xl"
                          >
                            <X className="h-3.5 w-3.5" />
                            Tidak
                          </button>
                        </div>
                      )}
                      {r.iVoted && (
                        <p className="text-[10px] font-medium text-forest text-center py-1">
                          Anda sudah vote
                          {r.iChoice === "NO" ? " (Tidak Setuju)" : r.iChoice ? " (Setuju)" : ""}
                        </p>
                      )}
                      {r.isTarget && (
                        <p className="text-[10px] text-ink-soft/60 text-center py-1">
                          Anda termasuk target — tidak bisa vote
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {done.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <SectionHeader title="Riwayat report" />
            {donePages > 1 && (
              <span className="text-[10px] text-ink-soft/60 shrink-0 mb-2">
                {page + 1}/{donePages}
              </span>
            )}
          </div>
          <div className="bg-white border border-line shadow-sm rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_7.5rem_4.5rem] gap-2 px-3 py-1.5 bg-page/80 border-b border-line text-[9px] font-semibold uppercase tracking-wide text-ink-soft/60">
              <span>Laporan</span>
              <span className="text-center">Tanggal</span>
              <span className="text-right">Status</span>
            </div>
            <div className="divide-y divide-line/40">
              {donePageItems.map((r) => {
                const d = r.created_at ? new Date(r.created_at) : null
                const dayLabel =
                  d && !Number.isNaN(d.getTime())
                    ? d.toLocaleDateString("id-ID", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })
                    : "—"
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setDetailId(r.id)}
                    className="w-full grid grid-cols-[1fr_7.5rem_4.5rem] gap-2 px-3 py-2.5 text-left items-center active:bg-page/50 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-ink truncate">
                        {r.reason}
                      </p>
                      <p className="text-[9px] text-ink-soft/60 truncate mt-0.5">
                        Target: {r.target_names.join(", ")} · −{r.delta} poin
                      </p>
                    </div>
                    <p className="text-center text-[10px] text-ink-soft/70 tabular-nums whitespace-nowrap">
                      {dayLabel}
                    </p>
                    <div className="flex justify-end">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
                          r.status === "APPROVED"
                            ? "bg-ok-bg text-forest"
                            : "bg-alert-bg text-alert"
                        }`}
                      >
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {donePages > 1 && (
            <div className="flex items-center justify-between gap-2 mt-2">
              <button
                type="button"
                disabled={page === 0}
                onClick={() => setDonePage((p) => Math.max(0, p - 1))}
                className="px-3 py-1.5 text-[11px] font-semibold rounded-xl bg-white border border-line text-ink disabled:opacity-40"
              >
                Sebelumnya
              </button>
              <span className="text-[10px] text-ink-soft/60 tabular-nums">
                Halaman {page + 1} dari {donePages}
              </span>
              <button
                type="button"
                disabled={page >= donePages - 1}
                onClick={() => setDonePage((p) => Math.min(donePages - 1, p + 1))}
                className="px-3 py-1.5 text-[11px] font-semibold rounded-xl bg-white border border-line text-ink disabled:opacity-40"
              >
                Berikutnya
              </button>
            </div>
          )}
        </div>
      )}

      {/* Homeroom: edit deskripsi lalu approve */}
      <Sheet
        open={Boolean(editId)}
        onClose={() => setEditId(null)}
        title="Terima Report"
      >
        <div className="space-y-3">
          <div>
            <p className="text-[11px] font-semibold text-ink">Deskripsi (bisa diperbaiki)</p>
            <textarea
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              rows={2}
              className={inputClass + " mt-1 resize-none scroll-y-only"}
            />
            <p className="mt-1 text-[9px] text-ink-soft/55">
              Jika report custom, teks ini menjadi preset baru untuk kelas.
            </p>
          </div>
          <button
            type="button"
            disabled={!editReason.trim()}
            onClick={() => void review(editId!, "APPROVED", editReason.trim())}
            className="w-full bg-forest text-white text-[12px] font-bold py-2.5 rounded-xl disabled:opacity-50"
          >
            Apply & Kurangi Poin
          </button>
        </div>
      </Sheet>

      {/* Detail riwayat report */}
      <Sheet
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title="Detail Report"
        fullHeight
      >
        {detail && (
          <div className="space-y-3 min-w-0">
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-ink break-words">{detail.reason}</p>
              <p className="text-[11px] text-ink-soft/70 mt-0.5">
                Target:{" "}
                <span className="font-semibold text-forest break-words">
                  {detail.target_names.join(", ")}
                </span>{" "}
                ·{" "}
                <span className="font-bold text-[#EEA34C] whitespace-nowrap">−{detail.delta} poin</span>
              </p>
            </div>
            {detail.note && (
              <div className="rounded-xl border border-dashed border-[#EEA34C]/50 bg-white px-3 py-2 min-w-0">
                <p className="text-[9px] font-semibold text-[#9a6a20] mb-0.5">Catatan:</p>
                <p className="text-[11px] text-ink leading-relaxed whitespace-pre-wrap break-words">
                  {detail.note}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-line bg-page/50 divide-y divide-line/40 min-w-0">
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-[10px] text-ink-soft/60">Status</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    detail.status === "APPROVED"
                      ? "bg-ok-bg text-forest"
                      : detail.status === "REJECTED"
                        ? "bg-alert-bg text-alert"
                        : "bg-amber/15 text-amber-800"
                  }`}
                >
                  {STATUS_LABEL[detail.status]}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2 min-w-0">
                <span className="text-[10px] text-ink-soft/60 shrink-0">Dilaporkan</span>
                <span className="text-[11px] font-medium text-ink text-right truncate min-w-0">
                  {formatDisplayName(detail.created_by_name) || detail.created_by}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2 min-w-0">
                <span className="text-[10px] text-ink-soft/60 shrink-0">Tanggal</span>
                <span className="text-[11px] font-medium text-ink text-right whitespace-nowrap">
                  {detail.created_at
                    ? new Date(detail.created_at).toLocaleDateString("id-ID", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2 min-w-0">
                <span className="text-[10px] text-ink-soft/60 shrink-0">Vote</span>
                <span className="text-[11px] font-medium text-ink whitespace-nowrap">
                  <span className="text-forest font-semibold">{detail.yesCount ?? 0} setuju</span>
                  <span className="text-ink-soft/40"> · </span>
                  <span className="text-alert font-semibold">{detail.noCount ?? 0} tidak</span>
                </span>
              </div>
            </div>

            {/* List pemilih — Homeroom selalu lihat area ini */}
            {canReview && (
              <div className="rounded-xl border border-line overflow-hidden">
                <div className="bg-page/80 px-3 py-1.5 border-b border-line flex items-center justify-between">
                  <p className="text-[10px] font-bold text-ink">Siapa yang vote</p>
                  <span className="text-[9px] text-ink-soft/50">
                    {(detail.yesVoters?.length ?? 0) + (detail.noVoters?.length ?? 0)} orang
                  </span>
                </div>
                <div className="grid grid-cols-[2rem_minmax(0,1fr)_2.5rem] gap-2 px-3 py-1.5 bg-page/60 border-b border-line text-[9px] font-medium uppercase tracking-wide text-ink-soft/55">
                  <span className="text-center">No</span>
                  <span className="min-w-0">Nama</span>
                  <span className="text-center">Votes</span>
                </div>
                <div className="scroll-y-only divide-y divide-line/40">
                  {(detail.yesVoters ?? []).map((name, i) => (
                    <div
                      key={`y-${i}`}
                      className="grid grid-cols-[2rem_minmax(0,1fr)_2.5rem] gap-2 items-center px-3 py-2 min-w-0"
                    >
                      <span className="text-center text-[10px] text-ink-soft/45 tabular-nums">
                        {i + 1}
                      </span>
                      <p className="min-w-0 text-[11px] font-medium text-ink truncate">
                        {name}
                      </p>
                      <span className="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-ok-bg text-forest">
                        <Check className="h-3 w-3" />
                      </span>
                    </div>
                  ))}
                  {(detail.noVoters ?? []).map((name, i) => {
                    const n = (detail.yesVoters?.length ?? 0) + i
                    return (
                      <div
                        key={`n-${i}`}
                        className="grid grid-cols-[2rem_minmax(0,1fr)_2.5rem] gap-2 items-center px-3 py-2 min-w-0"
                      >
                        <span className="text-center text-[10px] text-ink-soft/45 tabular-nums">
                          {n + 1}
                        </span>
                        <p className="min-w-0 text-[11px] font-medium text-ink truncate">
                          {name}
                        </p>
                        <span className="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-alert-bg text-alert">
                          <X className="h-3 w-3" />
                        </span>
                      </div>
                    )
                  })}
                  {(detail.yesVoters?.length ?? 0) === 0 &&
                    (detail.noVoters?.length ?? 0) === 0 && (
                      <p className="px-3 py-3 text-[11px] text-ink-soft/55">
                        Belum ada yang vote
                      </p>
                    )}
                </div>
              </div>
            )}
            {detail.hasPhoto && (
              <button
                type="button"
                onClick={() => void openPhoto(detail.id)}
                className="w-full flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#9a6a20] bg-[#EEA34C]/12 border border-[#EEA34C]/45 rounded-xl py-2"
              >
                <ImageIcon className="h-3.5 w-3.5" />
                Lihat Bukti
              </button>
            )}
          </div>
        )}
      </Sheet>

      {/* Lightbox foto — center layar */}
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
              alt="Foto bukti"
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

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-forest text-white text-[11px] font-semibold px-3 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
