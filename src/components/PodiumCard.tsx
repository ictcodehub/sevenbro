"use client"

import { User } from "lucide-react"
import { useT } from "@/lib/i18n"
import { formatDisplayName } from "@/lib/format"
import { VerifiedBadge, usePositions } from "@/components/VerifiedBadge"

export type PodiumStudent = {
  student_id: string
  full_name: string
  total_points: number
}

/**
 * Kartu podium juara 1/2/3 — dipakai halaman Points dan kartu Beranda.
 * `onOpen` diisi hanya kalau kartu berdiri sendiri; di Beranda kartu dibungkus
 * Link, jadi cukup div supaya tidak ada button bersarang di dalam <a>.
 */
export function PodiumCard({
  rank,
  student,
  isMe = false,
  muted,
  onOpen,
}: {
  rank: number
  student: PodiumStudent
  isMe?: boolean
  muted?: boolean
  onOpen?: () => void
}) {
  const t = useT()
  const podiumClass = rank === 1 ? "podium-1" : rank === 2 ? "podium-2" : "podium-3"
  const posIndex = usePositions("podium")

  const cls = `flex flex-col items-center active:scale-[0.97] transition-transform ${
    muted ? "" : "rank-pop"
  } ${
    rank === 1 ? "order-2 w-[36%] max-w-[130px]" : "order-1 w-[30%] max-w-[110px]"
  } ${rank === 3 ? "order-3" : ""} ${rank !== 1 ? "mt-6" : ""}`

  const body = (
    <>
      {/* Slot mahkota mewah — hanya #1, mati saat seri */}
      <div className="h-8 flex items-end justify-center mb-1 relative">
        {rank === 1 && !muted && (
          <svg viewBox="0 0 48 36" className="w-11 h-8 crown-glow" aria-hidden="true">
            <defs>
              <linearGradient id="crownGold" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="45%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#d97706" />
              </linearGradient>
              <linearGradient id="crownGoldEdge" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#fef08a" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
            <path
              d="M6 28 L4 10 L14 18 L24 4 L34 18 L44 10 L42 28 Z"
              fill="url(#crownGold)"
              stroke="url(#crownGoldEdge)"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            <rect
              x="5"
              y="26"
              width="38"
              height="6"
              rx="1.5"
              fill="url(#crownGold)"
              stroke="#b45309"
              strokeWidth="0.8"
            />
            <circle cx="24" cy="29" r="2.2" fill="#ef4444" stroke="#fca5a5" strokeWidth="0.6" />
            <circle cx="12" cy="29" r="1.6" fill="#2dd4bf" stroke="#99f6e4" strokeWidth="0.5" />
            <circle cx="36" cy="29" r="1.6" fill="#a78bfa" stroke="#ddd6fe" strokeWidth="0.5" />
            <circle cx="24" cy="5" r="2" fill="#fde047" stroke="#f59e0b" strokeWidth="0.5" />
            <circle cx="4" cy="11" r="1.4" fill="#fbbf24" stroke="#d97706" strokeWidth="0.4" />
            <circle cx="44" cy="11" r="1.4" fill="#fbbf24" stroke="#d97706" strokeWidth="0.4" />
            <path d="M18 12 L20 16 L16 16 Z" fill="#fef9c3" opacity="0.85" />
          </svg>
        )}
      </div>
      <div
        className={`relative h-12 w-12 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
          muted
            ? "bg-ink-soft/25 text-white/70 border-ink-soft/40"
            : rank === 1
              ? "bg-amber text-deep border-amber"
              : rank === 2
                ? "bg-teal-300 text-deep border-teal-400"
                : "bg-acid text-forest border-lime/60"
        } ${isMe && !muted ? "me-ring" : ""}`}
      >
        <User className={`h-5 w-5 ${muted ? "opacity-40" : "opacity-80"}`} strokeWidth={1.75} />
        {!muted && (
          <span
            className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full text-[11px] font-bold flex items-center justify-center text-white ${podiumClass}`}
          >
            {rank}
          </span>
        )}
      </div>
      <p
        className={`mt-2 max-w-full truncate px-1 font-bold ${
          muted
            ? "text-sm-plus text-white/45"
            : rank === 1
              ? "text-sm-plus text-acid"
              : "text-sm-plus text-white/90"
        }`}
      >
        {muted ? (
          "—"
        ) : (
          <span className="inline-flex items-center gap-0.5 max-w-full">
            {formatDisplayName(student.full_name)}
            <VerifiedBadge
              position={posIndex.byId.get(student.student_id)}
              className="h-3 w-3"
            />
          </span>
        )}
      </p>
      <p className="text-[11px] font-semibold text-white/55 mt-0.5">
        {muted ? t("poin.waitingPts") : t("poin.rank", { n: rank })}
      </p>
      <div className="mt-2.5 w-full">
        <div
          className={`w-full pt-2 pb-5 text-center ${
            muted ? "bg-white/15" : podiumClass
          }`}
          style={{ clipPath: "polygon(0 0, 100% 0, 100% 84%, 50% 100%, 0 84%)" }}
        >
          <p className="text-[22px] font-semibold leading-none text-white drop-shadow">
            {muted ? "—" : student.total_points}
          </p>
          {!muted && (
            <p className="mt-1 text-[9px] font-semibold text-white/85">pts</p>
          )}
        </div>
      </div>
    </>
  )

  if (onOpen) {
    return (
      <button type="button" onClick={onOpen} className={cls}>
        {body}
      </button>
    )
  }
  return <div className={cls}>{body}</div>
}
