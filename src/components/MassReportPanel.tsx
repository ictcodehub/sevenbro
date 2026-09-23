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
import { useT } from "@/lib/i18n"
import { VerifiedBadge, usePositions, type PositionIndex } from "@/components/VerifiedBadge"

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

/** Daftar nama target + badge verified via lookup nama */
function TargetNames({ names, index }: { names: string[]; index: PositionIndex }) {
  return (
    <span className="font-semibold text-forest break-words">
      {names.map((n, i) => (
        <span key={`${n}-${i}`} className="inline-flex items-center gap-0.5">
          {formatDisplayName(n)}
          <VerifiedBadge position={index.byName.get(n.toLowerCase())} className="h-3 w-3" />
          {i < names.length - 1 ? ", " : ""}
        </span>
      ))}
    </span>
  )
}

export default function MassReportPanel() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const canReview = canReviewMassReport(role ?? "")
  const canCreate = canCreateMassReport(role ?? "")
  const posIndex = usePositions("mass-report")

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

  const t = useT()
  const statusLabel = (s: string) => t(`report.status.${s.toLowerCase()}` as "report.status.voting" | "report.status.ready" | "report.status.approved" | "report.status.rejected" | "report.status.closed")
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
      if (!r.ok) throw new Error(b?.error || t("report.voteFailed"))
      flash(
        t(choice === "YES" ? "report.voteYesDone" : "report.voteNoDone"),
      )
      await mutate()
    } catch (e) {
      flash(e instanceof Error ? e.message : t("common.failed"))
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
      if (!r.ok) throw new Error(b?.error || t("common.failed"))
      flash(t(decision === "APPROVED" ? "report.approvedPoints" : "report.rejected"))
      setEditId(null)
      await mutate()
    } catch (e) {
      flash(e instanceof Error ? e.message : t("common.failed"))
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
      flash(t("report.photoMissing"))
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <SectionHeader title={t("report.title")} />
        {canCreate && (
          <Link
            href="/app/report/new"
            className="flex items-center gap-1 bg-alert text-white text-sm font-semibold px-3 py-1.5 rounded-xl active:scale-[0.97] transition-transform shrink-0 mb-2"
          >
            <Flag className="h-3.5 w-3.5" />
            {t("report.create")}
          </Link>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-alert bg-alert-bg border border-alert/20 rounded-xl px-3 py-2">
          {t("report.loadError")}
        </p>
      )}

      {active.length === 0 && !error ? (
        <EmptyState
          icon={<Flag className="h-6 w-6" />}
          message={t("report.emptyActive")}
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
                    <p className="text-sm font-semibold text-ink truncate">{r.reason}</p>
                    {r.is_custom && r.original_reason && r.original_reason !== r.reason && (
                      <p className="text-xs text-ink-soft/50 truncate">
                        {t("report.draftKetua")} {r.original_reason}
                      </p>
                    )}
                    <p className="text-xs mt-0.5 truncate">
                      <span className="text-ink-soft/70">{t("report.target")} </span>
                      <span className="font-semibold text-forest">
                        {r.target_names.join(", ") || "—"}
                      </span>
                      <span className="text-ink-soft/40"> · </span>
                      <span className="font-bold text-[#EEA34C]">−{r.delta} poin</span>
                    </p>
                    <p className="text-xs text-ink-soft/50 mt-1">
                      Oleh {formatDisplayName(r.created_by_name) || r.created_by}
                      {r.hasPhoto ? t("report.hasPhoto") : ""}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                      r.status === "READY"
                        ? "bg-amber/15 text-amber-800 border border-amber/30"
                        : "bg-forest/10 text-forest border border-forest/20"
                    }`}
                  >
                    {statusLabel(r.status)}
                  </span>
                </div>

                {r.note && (
                  <div className="rounded-xl border border-dashed border-[#EEA34C]/50 bg-white px-2.5 py-2">
                      <p className="text-[11px] font-semibold text-[#9a6a20] mb-0.5">{t("report.noteLabel")}</p>
                    <p className="text-sm-plus text-ink leading-snug whitespace-pre-wrap">
                      {r.note}
                    </p>
                  </div>
                )}

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-ink-soft/60">
                      <span>
                        {t("report.voteCount", { yes: r.yesCount ?? 0, no: r.noCount ?? 0, min: r.threshold ?? 10 })}
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
                    className="text-xs font-semibold text-forest"
                  >
                    {expandId === r.id
                      ? t("report.hideVoteDetail")
                      : t("report.showVoters", { n: (r.yesVoters?.length ?? 0) + (r.noVoters?.length ?? 0) })}
                  </button>
                )}

                {canReview && expandId === r.id && (
                  <div className="rounded-xl border border-line overflow-hidden">
                    <div className="bg-page/80 px-3 py-1.5 border-b border-line flex items-center justify-between">
                      <p className="text-xs font-bold text-ink">{t("report.voteDetail")}</p>
                      <span className="text-[11px] text-ink-soft/50">
                        {t("report.votersCount", { n: (r.yesVoters?.length ?? 0) + (r.noVoters?.length ?? 0) })}
                      </span>
                    </div>
                    <div className="grid grid-cols-[2rem_minmax(0,1fr)_2.5rem] gap-2 px-3 py-1.5 bg-page/60 border-b border-line text-[11px] font-medium uppercase tracking-wide text-ink-soft/55">
                      <span className="text-center">{t("kas.colNo")}</span>
                      <span className="min-w-0">{t("kas.colName")}</span>
                      <span className="text-center">{t("report.votesCol")}</span>
                    </div>
                    <div className="max-h-48 scroll-y-only divide-y divide-line/40">
                      {(r.yesVoters ?? []).map((name, i) => (
                        <div
                          key={`y-${i}`}
                          className="grid grid-cols-[2rem_minmax(0,1fr)_2.5rem] gap-2 items-center px-3 py-2 min-w-0"
                        >
                          <span className="text-center text-xs text-ink-soft/45 tabular-nums">
                            {i + 1}
                          </span>
                          <p className="min-w-0 text-sm font-medium text-ink truncate">
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
                            <span className="text-center text-xs text-ink-soft/45 tabular-nums">
                              {n + 1}
                            </span>
                            <p className="min-w-0 text-sm font-medium text-ink truncate">
                              {name}
                            </p>
                            <span className="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-alert-bg text-alert">
                              <X className="h-3 w-3" />
                            </span>
                          </div>
                        )
                      })}
                      {(r.yesVoters?.length || r.noVoters?.length) ? null : (
                        <p className="px-3 py-3 text-xs text-ink-soft/60">                        {t("report.noVotesYet")}</p>
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
                      className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-[#9a6a20] bg-[#EEA34C]/12 border border-[#EEA34C]/45 rounded-xl py-2"
                    >
                      <ImageIcon className="h-3.5 w-3.5" />
                      {t("report.viewProof")}
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
                          className="flex items-center justify-center gap-1 bg-forest text-white text-sm font-semibold py-2.5 rounded-xl"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {t("report.accept")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void review(r.id, "REJECTED")}
                          className="flex items-center justify-center gap-1 bg-page border border-line text-ink text-sm font-semibold py-2.5 rounded-xl"
                        >
                          <X className="h-3.5 w-3.5" />
                          {t("roster.reject")}
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
                            className="flex items-center justify-center gap-1 bg-forest text-white text-sm font-semibold py-2.5 rounded-xl"
                          >
                            <Check className="h-3.5 w-3.5" />
                            {t("report.voteYes")}
                          </button>
                          <button
                            type="button"
                            onClick={() => void vote(r.id, "NO")}
                            className="flex items-center justify-center gap-1 bg-page border border-line text-ink text-sm font-semibold py-2.5 rounded-xl"
                          >
                            <X className="h-3.5 w-3.5" />
                            {t("report.voteNo")}
                          </button>
                        </div>
                      )}
                      {r.iVoted && (
                        <p className="text-xs font-medium text-forest text-center py-1">
                          {t("report.voted")}
                          {r.iChoice === "NO" ? ` (${t("report.voteNo")})` : r.iChoice ? ` (${t("report.voteYes")})` : ""}
                        </p>
                      )}
                      {r.isTarget && (
                        <p className="text-xs text-ink-soft/60 text-center py-1">
                          {t("report.isTarget")}
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
            <SectionHeader title={t("report.history")} />
            {donePages > 1 && (
              <span className="text-xs text-ink-soft/60 shrink-0 mb-2">
                {page + 1}/{donePages}
              </span>
            )}
          </div>
          <div className="bg-white border border-line shadow-sm rounded-xl overflow-hidden">
            <div className="grid grid-cols-[1fr_7.5rem_4.5rem] gap-2 px-3 py-1.5 bg-page/80 border-b border-line text-[11px] font-semibold uppercase tracking-wide text-ink-soft/60">
              <span>{t("report.colReport")}</span>
              <span className="text-center">{t("report.colDate")}</span>
              <span className="text-right">{t("report.colStatus")}</span>
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
                      <p className="text-sm font-semibold text-ink truncate">
                        {r.reason}
                      </p>
                      <p className="text-xs text-ink-soft/60 truncate mt-0.5">
                        {t("report.targetLine", {
                          names: r.target_names.map((n) => formatDisplayName(n)).join(", "),
                          amount: r.delta,
                        })}
                      </p>
                    </div>
                    <p className="text-center text-xs text-ink-soft/70 tabular-nums whitespace-nowrap">
                      {dayLabel}
                    </p>
                    <div className="flex justify-end">
                      <span
                        className={`text-[11px] font-bold px-1.5 py-0.5 rounded whitespace-nowrap ${
                          r.status === "APPROVED"
                            ? "bg-ok-bg text-forest"
                            : "bg-alert-bg text-alert"
                        }`}
                      >
                        {statusLabel(r.status)}
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
                className="px-3 py-1.5 text-sm font-semibold rounded-xl bg-white border border-line text-ink disabled:opacity-40"
              >
                {t("common.prev")}
              </button>
              <span className="text-xs text-ink-soft/60 tabular-nums">
                {t("report.pageOf", { a: page + 1, b: donePages })}
              </span>
              <button
                type="button"
                disabled={page >= donePages - 1}
                onClick={() => setDonePage((p) => Math.min(donePages - 1, p + 1))}
                className="px-3 py-1.5 text-sm font-semibold rounded-xl bg-white border border-line text-ink disabled:opacity-40"
              >
                {t("common.next")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Homeroom: edit deskripsi lalu approve */}
      <Sheet
        open={Boolean(editId)}
        onClose={() => setEditId(null)}
        title={t("report.acceptTitle")}
      >
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-ink">{t("report.descEditable")}</p>
            <textarea
              value={editReason}
              onChange={(e) => setEditReason(e.target.value)}
              rows={2}
              className={inputClass + " mt-1 resize-none scroll-y-only"}
            />
            <p className="mt-1 text-[11px] text-ink-soft/55">
              {t("report.customPresetHint")}
            </p>
          </div>
          <button
            type="button"
            disabled={!editReason.trim()}
            onClick={() => void review(editId!, "APPROVED", editReason.trim())}
            className="w-full bg-forest text-white text-sm font-bold py-2.5 rounded-xl disabled:opacity-50"
          >
            {t("report.applyDeduct")}
          </button>
        </div>
      </Sheet>

      {/* Detail riwayat report */}
      <Sheet
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title={t("report.detailTitle")}
        fullHeight
      >
        {detail && (
          <div className="space-y-3 min-w-0">
            <div className="min-w-0">
              <p className="text-sm-plus text-ink break-words">{detail.reason}</p>              <p className="text-xs text-ink-soft/70 mt-0.5">
                Target:{" "}
                <TargetNames names={detail.target_names} index={posIndex} />
                {" "}·{" "}
                <span className="font-bold text-[#EEA34C] whitespace-nowrap">−{detail.delta} poin</span>
              </p>
            </div>
            {detail.note && (
              <div className="rounded-xl border border-dashed border-[#EEA34C]/50 bg-white px-3 py-2 min-w-0">
                <p className="text-[11px] font-semibold text-[#9a6a20] mb-0.5">{t("report.noteLabel")}</p>
                <p className="text-sm-plus text-ink leading-relaxed whitespace-pre-wrap break-words">
                  {detail.note}
                </p>
              </div>
            )}

            <div className="rounded-xl border border-line bg-page/50 divide-y divide-line/40 min-w-0">
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-xs text-ink-soft/60">{t("report.status")}</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    detail.status === "APPROVED"
                      ? "bg-ok-bg text-forest"
                      : detail.status === "REJECTED"
                        ? "bg-alert-bg text-alert"
                        : "bg-amber/15 text-amber-800"
                  }`}
                >
                  {statusLabel(detail.status)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2 min-w-0">
                <span className="text-xs text-ink-soft/60 shrink-0">{t("report.reportedBy")}</span>
                <span className="text-[11px] font-medium text-ink text-right truncate min-w-0">
                  {formatDisplayName(detail.created_by_name) || detail.created_by}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-2 min-w-0">
                <span className="text-xs text-ink-soft/60 shrink-0">{t("report.colDate")}</span>
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
                <span className="text-xs text-ink-soft/60 shrink-0">Vote</span>
                <span className="text-[11px] font-medium text-ink whitespace-nowrap">
                  <span className="text-forest font-semibold">{t("report.voteYesCount", { n: detail.yesCount ?? 0 })}</span>
                  <span className="text-ink-soft/40"> · </span>
                  <span className="text-alert font-semibold">{t("report.voteNoCount", { n: detail.noCount ?? 0 })}</span>
                </span>
              </div>
            </div>

            {/* List pemilih — Homeroom selalu lihat area ini */}
            {canReview && (
              <div className="rounded-xl border border-line overflow-hidden">
                <div className="bg-page/80 px-3 py-1.5 border-b border-line flex items-center justify-between">
                    <p className="text-xs font-bold text-ink">{t("report.whoVoted")}</p>
                    <span className="text-[11px] text-ink-soft/50">
                      {t("report.votersCount", { n: (detail.yesVoters?.length ?? 0) + (detail.noVoters?.length ?? 0) })}
                    </span>
                </div>
                <div className="grid grid-cols-[2rem_minmax(0,1fr)_2.5rem] gap-2 px-3 py-1.5 bg-page/60 border-b border-line text-[11px] font-medium uppercase tracking-wide text-ink-soft/55">
                  <span className="text-center">{t("kas.colNo")}</span>
                  <span className="min-w-0">{t("kas.colName")}</span>
                  <span className="text-center">{t("report.votesCol")}</span>
                </div>
                <div className="scroll-y-only divide-y divide-line/40">
                  {(detail.yesVoters ?? []).map((name, i) => (
                    <div
                      key={`y-${i}`}
                      className="grid grid-cols-[2rem_minmax(0,1fr)_2.5rem] gap-2 items-center px-3 py-2 min-w-0"
                    >
                      <span className="text-center text-xs text-ink-soft/45 tabular-nums">
                        {i + 1}
                      </span>
                      <p className="min-w-0 text-sm font-medium text-ink truncate">
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
                        <span className="text-center text-xs text-ink-soft/45 tabular-nums">
                          {n + 1}
                        </span>
                        <p className="min-w-0 text-sm font-medium text-ink truncate">
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
                        {t("report.noVoters")}
                      </p>
                    )}
                </div>
              </div>
            )}
            {detail.hasPhoto && (
              <button
                type="button"
                onClick={() => void openPhoto(detail.id)}
                className="w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-[#9a6a20] bg-[#EEA34C]/12 border border-[#EEA34C]/45 rounded-xl py-2"
              >
<ImageIcon className="h-3.5 w-3.5" />
                      {t("report.viewProof")}
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
          aria-label={t("report.photoProof")}
        >
          <button
            type="button"
            aria-label={t("report.closePhoto")}
            onClick={() => setPhotoOpen(false)}
            className="absolute inset-0 bg-ink/70"
          />
          <div className="relative z-10 flex flex-col items-center gap-3 max-w-full max-h-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoUrl}
              alt={t("report.photoProof")}
              className="max-w-full max-h-[75vh] object-contain rounded-xl border border-white/10 shadow-2xl bg-page"
            />
            <button
              type="button"
              onClick={() => setPhotoOpen(false)}
              className="rounded-xl bg-white/95 px-4 py-2 text-sm font-semibold text-ink"
            >
              {t("common.close")}
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-forest text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
