"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  AlertTriangle,
  ArrowDownRight,
  Check,
  ChevronDown,
  Flame,
  History,
  Inbox,
  Minus,
  Plus,
  QrCode,
  Sparkles,
  Trophy,
  User,
  Zap,
} from "lucide-react"
import { SectionHeader, EmptyState } from "@/components/ui-primitives"
import { useAppSWR } from "@/lib/fetcher"
import { Sheet, Field } from "@/components/ui/sheet"
import { StudentMultiSelect } from "@/components/StudentSelect"
import { canGivePoints, canAdmin } from "@/lib/policies"
import { RoleGate } from "@/components/RoleGate"
import FeatureGate from "@/components/FeatureGate"
import QRCode from "qrcode"
import { formatDateID, formatTimeID, formatDisplayName } from "@/lib/format"
import MassReportPanel from "@/components/MassReportPanel"

type LeaderRow = {
  student_id: string
  full_name: string
  position: string
  total_points: number
}

type PointLog = {
  id: string
  kind: "PRESTASI" | "PELANGGARAN" | string
  delta: number
  reason: string
  created_by: string | null
  created_at: string
  student?: { id: string; full_name: string } | null
}

type PointsPayload = {
  leaderboard: LeaderRow[]
  recent: PointLog[]
  history: PointLog[]
  studentId: string | null
}

type StudentOpt = { id: string; full_name: string; position: string }
type StudentDetail = { student: LeaderRow | null; history: PointLog[] }

/** Preset alasan manual — SSOT docs/POINT_SYSTEM.md (A1 kas = auto; delta = saran; skor manual) */
const POINT_PRESETS = {
  PRESTASI: [
    { label: "Perfect Score DT", delta: 5 },
    { label: "Perfect Score PT", delta: 5 },
    { label: "Mengerjakan Piket", delta: 1 },
    { label: "Juara Lomba", delta: 5 },
  ],
  PELANGGARAN: [
    { label: "Tidak Mengerjakan Piket", delta: 1 },
    { label: "Tidak Patuh Aturan Kelas", delta: 2 },
    { label: "Ganggu Proses Belajar", delta: 3 },
    { label: "Kasar / Tidak Sopan", delta: 3 },
    { label: "Tidak Mengerjakan / Mengumpulkan Tugas, PR, dll", delta: 3 },
    { label: "Melanggar Aturan Sekolah", delta: 5 },
    { label: "Merusak Fasilitas Sekolah", delta: 10 },
  ],
} as const

type PointPresetKind = keyof typeof POINT_PRESETS

/** Section card — frame putih seperti Brief Info, ukuran teks normal */
function FormSectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-line bg-white shadow-sm">
      <div className="border-b border-line bg-page px-3.5 py-3 rounded-t-2xl">
        <p className="text-sm font-bold text-ink">{title}</p>
        {subtitle && (
          <p className="text-xs text-ink-soft/70 leading-snug mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="p-3.5 space-y-4">{children}</div>
    </div>
  )
}

const RANK_LABEL: Record<number, string> = {
  1: "Peringkat 1",
  2: "Peringkat 2",
  3: "Peringkat 3",
}

function personName(full: string) {
  return formatDisplayName(full)
}

function whenLabel(iso: string) {
  try {
    const d = new Date(iso)
    return `${formatDateID(d)} · ${formatTimeID(d)}`
  } catch {
    return iso
  }
}

/** Ikon delta poin gaya game — double chevron + kilau */
function GameDeltaIcon({ up }: { up: boolean }) {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
      {up ? (
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 10 L8 5 L12 10" />
          <path d="M5.5 12.5 L8 9.2 L10.5 12.5" opacity="0.45" />
        </g>
      ) : (
        <g fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 6 L8 11 L12 6" />
          <path d="M5.5 3.5 L8 6.8 L10.5 3.5" opacity="0.45" />
        </g>
      )}
    </svg>
  )
}

function DeltaBadge({ delta }: { delta: number }) {
  const plus = delta > 0
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
        plus ? "bg-lime text-deep" : "bg-alert text-white"
      }`}
    >
      {plus ? <Zap className="h-2.5 w-2.5" /> : <ArrowDownRight className="h-2.5 w-2.5" />}
      {plus ? "+" : ""}
      {delta}
    </span>
  )
}

function HistoryList({ items, showStudent }: { items: PointLog[]; showStudent?: boolean }) {
  if (items.length === 0) {
    return <EmptyState icon={<History className="h-6 w-6" />} message="Belum ada riwayat poin" />
  }
  return (
    <div className="space-y-1.5">
      {items.map((log) => (
        <div
          key={log.id}
          className={`rounded-xl p-2.5 flex items-start gap-2.5 border ${
            log.delta > 0
              ? "bg-lime-soft/30 border-lime/40"
              : "bg-alert-bg border-alert/25"
          }`}
        >
          <div
            className={`mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
              log.delta > 0 ? "bg-forest text-lime" : "bg-alert text-white"
            }`}
          >
            {log.delta > 0 ? <Zap className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] font-semibold text-ink leading-snug">{log.reason}</p>
              <DeltaBadge delta={log.delta} />
            </div>
            <p className="mt-0.5 text-[9px] text-ink-soft/60 truncate">
              {showStudent && log.student?.full_name ? `${formatDisplayName(log.student.full_name)} · ` : ""}
              {log.kind === "PELANGGARAN" ? "Pelanggaran" : "Prestasi"}
              {" · "}
              {log.created_by || "—"}
              {" · "}
              {whenLabel(log.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function PodiumCard({
  rank,
  student,
  isMe,
  maxPts,
  muted,
  onOpen,
}: {
  rank: number
  student: LeaderRow
  isMe: boolean
  maxPts: number
  muted?: boolean
  onOpen: () => void
}) {
  const pct = maxPts > 0 ? Math.min(100, (student.total_points / maxPts) * 100) : 0
  const podiumClass = rank === 1 ? "podium-1" : rank === 2 ? "podium-2" : "podium-3"

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex flex-col items-center active:scale-[0.97] transition-transform ${muted ? "" : "rank-pop"} ${
        rank === 1 ? "order-2 w-[36%] max-w-[130px]" : "order-1 w-[30%] max-w-[110px]"
      } ${rank === 3 ? "order-3" : ""} ${rank !== 1 ? "mt-6" : ""}`}
    >
      {/* Slot mahkota mewah — hanya #1, mati saat seri */}
      <div className="h-8 flex items-end justify-center mb-1 relative">
        {rank === 1 && !muted && (
          <svg
            viewBox="0 0 48 36"
            className="w-11 h-8 crown-glow"
            aria-hidden="true"
          >
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
            {/* Body mahkota */}
            <path
              d="M6 28 L4 10 L14 18 L24 4 L34 18 L44 10 L42 28 Z"
              fill="url(#crownGold)"
              stroke="url(#crownGoldEdge)"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Band bawah */}
            <rect x="5" y="26" width="38" height="6" rx="1.5" fill="url(#crownGold)" stroke="#b45309" strokeWidth="0.8" />
            {/* Permata merah tengah */}
            <circle cx="24" cy="29" r="2.2" fill="#ef4444" stroke="#fca5a5" strokeWidth="0.6" />
            {/* Permata kiri-kanan */}
            <circle cx="12" cy="29" r="1.6" fill="#2dd4bf" stroke="#99f6e4" strokeWidth="0.5" />
            <circle cx="36" cy="29" r="1.6" fill="#a78bfa" stroke="#ddd6fe" strokeWidth="0.5" />
            {/* Titik emas di puncak */}
            <circle cx="24" cy="5" r="2" fill="#fde047" stroke="#f59e0b" strokeWidth="0.5" />
            <circle cx="4" cy="11" r="1.4" fill="#fbbf24" stroke="#d97706" strokeWidth="0.4" />
            <circle cx="44" cy="11" r="1.4" fill="#fbbf24" stroke="#d97706" strokeWidth="0.4" />
            {/* Kilau */}
            <path d="M18 12 L20 16 L16 16 Z" fill="#fef9c3" opacity="0.85" />
          </svg>
        )}
      </div>
      <div
        className={`relative h-12 w-12 rounded-full flex items-center justify-center text-[13px] font-bold border-2 ${
          muted
            ? "bg-ink-soft/25 text-white/70 border-ink-soft/40"
            : rank === 1
              ? "bg-amber text-deep border-amber"
              : rank === 2
                ? "bg-teal-300 text-deep border-teal-400"
                : "bg-amber/30 text-deep border-amber/60"
        } ${isMe && !muted ? "me-ring" : ""}`}
      >
        <User className={`h-5 w-5 ${muted ? "opacity-40" : "opacity-80"}`} strokeWidth={1.75} />
        {!muted && (
          <span
            className={`absolute -bottom-1 -right-1 h-5 w-5 rounded-full text-[9px] font-bold flex items-center justify-center text-white ${podiumClass}`}
          >
            {rank}
          </span>
        )}
      </div>
      <p
        className={`mt-2 max-w-full truncate px-1 font-bold ${
          muted
            ? "text-[13px] text-white/45"
            : rank === 1
              ? "text-[12px] text-acid"
              : "text-[11px] text-white/90"
        }`}
      >
        {muted ? "—" : personName(student.full_name)}
      </p>
      <p className="text-[9px] font-semibold text-white/55 mt-0.5">
        {muted ? "Menunggu poin" : RANK_LABEL[rank]}
      </p>
      <div className={`mt-1.5 w-full rounded-t-lg px-2 pt-1.5 pb-2 ${muted ? "bg-ink-soft/40" : podiumClass}`}>
        <p className="text-[13px] font-black text-white leading-none drop-shadow">
          {muted ? "—" : student.total_points}
        </p>
        <p className="text-[8px] text-white/80 font-medium">poin</p>
        {!muted && (
          <div className="mt-1 h-1 w-full bg-white/25 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-white/90 xp-bar-fill"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </button>
  )
}

const PAGE_ROLES = ["HOMEROOM", "KETUA", "BENDAHARA", "SEKRETARIS", "ANGGOTA"]

/**
 * Base URL untuk QR Beri Poin.
 * - Prod / dibuka di domain asli → origin yang sedang dipakai (sevenbro.vercel.app)
 * - localhost → NEXT_PUBLIC_APP_URL (IP LAN) supaya HP di kelas bisa scan
 */
function getQrBaseUrl(): string {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_APP_URL || ""
  }
  const { hostname, origin } = window.location
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return process.env.NEXT_PUBLIC_APP_URL || origin
  }
  return origin
}

export default function PoinPage() {
  return (
    <RoleGate allow={PAGE_ROLES}>
      <FeatureGate feature="poin_enabled" label="Poin">
        <PoinInner />
      </FeatureGate>
    </RoleGate>
  )
}

function PoinInner() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const canGive = canGivePoints(role ?? "")
  const isAdmin = canAdmin(role ?? "")
  const { data: meCtx } = useAppSWR<{ classId?: string }>(isAdmin ? "/api/me" : null)
  const { data, error, mutate } = useAppSWR<PointsPayload>("/api/points")
  const { data: students } = useAppSWR<StudentOpt[]>(canGive ? "/api/admin/students" : null)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)

  useEffect(() => {
    if (!showQr || !meCtx?.classId) return
    const url = `${getQrBaseUrl()}/app/scan?c=${meCtx.classId}`
    QRCode.toDataURL(url, { width: 220, margin: 1, color: { dark: "#0D211C", light: "#FFFFFF" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [showQr, meCtx?.classId])

  const [open, setOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const { data: detail } = useAppSWR<StudentDetail>(
    detailId ? `/api/points?studentId=${detailId}` : null,
  )

  const [studentIds, setStudentIds] = useState<string[]>([])
  const [kind, setKind] = useState<"PRESTASI" | "PELANGGARAN">("PRESTASI")
  const [amount, setAmount] = useState(2)
  const [reason, setReason] = useState("")
  const [quickOpen, setQuickOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [tab, setTab] = useState<"peringkat" | "riwayat" | "report">("peringkat")
  const [reportCount, setReportCount] = useState(0)
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")

  const nameById = new Map(
    (students ?? []).map((s) => [s.id, formatDisplayName(s.full_name)] as const),
  )
  const selectedNames = studentIds.map((id) => nameById.get(id) ?? "")

  useEffect(() => {
    if (tabParam === "report") setTab("report")
  }, [tabParam])

  const meName = session?.user?.name
  const rows = data?.leaderboard ?? []
  const myIndex = rows.findIndex(
    (r) => r.student_id === data?.studentId || r.full_name === meName,
  )
  const me = myIndex >= 0 ? rows[myIndex] : null
  const maxPts = rows[0]?.total_points || 1
  // Podium mati kalau top skor masih seri — belum ada pemenang nyata
  const top3 = rows.slice(0, 3)
  const podiumMuted =
    top3.length >= 2 && top3.every((p) => p.total_points === top3[0]!.total_points)

  useEffect(() => {
    let cancelled = false
    const loadReports = async () => {
      try {
        const r = await fetch("/api/mass-reports", { headers: { Accept: "application/json" } })
        if (!r.ok || cancelled) return
        const b = (await r.json()) as { reports?: { status?: string }[] }
        const active = (b.reports ?? []).filter(
          (x) => x.status === "VOTING" || x.status === "READY",
        )
        if (!cancelled) setReportCount(active.length)
      } catch {}
    }
    void loadReports()
    const t = setInterval(() => void loadReports(), 30000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const submit = async () => {
    setErr(null)
    if (studentIds.length === 0 || !reason.trim()) {
      setErr("Pilih siswa dan isi alasan")
      return
    }
    const abs = Math.abs(Math.round(amount))
    if (!Number.isFinite(abs) || abs < 1 || abs > 100) {
      setErr("Skor harus 1–100")
      return
    }
    setSaving(true)
    try {
      const r = await fetch("/api/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds,
          kind,
          delta: abs,
          reason: reason.trim(),
        }),
      })
      const body = await r.json().catch(() => null)
      if (!r.ok) throw new Error(body?.error || `Gagal (${r.status})`)
      setOpen(false)
      setStudentIds([])
      setReason("")
      setAmount(2)
      setKind("PRESTASI")
      flash("Poin berhasil disimpan.")
      await mutate()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan")
    } finally {
      setSaving(false)
    }
  }

  const rest = rows.slice(3)
  const lastLogByStudent = new Map<string, PointLog>()
  for (const log of data?.recent ?? []) {
    const sid = log.student?.id
    if (sid && !lastLogByStudent.has(sid)) lastLogByStudent.set(sid, log)
  }

  return (
    <div className="min-h-full">
      {/* Style di-inline biar tidak hilang kalau CSS global cache basi */}
      <style>{`
        .arena-bg {
          background:
            radial-gradient(ellipse 80% 50% at 50% -10%, #1a4d38 0%, transparent 55%),
            #0d211c;
        }
        .podium-1 {
          background: linear-gradient(180deg, #fbbf24 0%, #d97706 100%);
          box-shadow: 0 4px 0 #92400e, 0 0 24px rgba(251, 191, 36, 0.35);
        }
        .podium-2 {
          background: linear-gradient(180deg, #5eead4 0%, #0d9488 100%);
          box-shadow: 0 4px 0 #115e59, 0 0 18px rgba(45, 212, 191, 0.25);
        }
        .podium-3 {
          background: linear-gradient(180deg, #fdba74 0%, #ea580c 100%);
          box-shadow: 0 4px 0 #9a3412;
        }
        .crown-glow {
          filter:
            drop-shadow(0 0 4px rgba(253, 224, 71, 0.9))
            drop-shadow(0 0 12px rgba(251, 191, 36, 0.55))
            drop-shadow(0 2px 2px rgba(0, 0, 0, 0.35));
          animation: crown-bob 2.4s ease-in-out infinite, crown-shimmer 1.8s ease-in-out infinite alternate;
        }
        @keyframes crown-bob {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-4px) scale(1.04); }
        }
        @keyframes crown-shimmer {
          from { filter: drop-shadow(0 0 4px rgba(253, 224, 71, 0.75)) drop-shadow(0 0 10px rgba(251, 191, 36, 0.4)) drop-shadow(0 2px 2px rgba(0,0,0,0.35)); }
          to   { filter: drop-shadow(0 0 8px rgba(253, 224, 71, 1)) drop-shadow(0 0 20px rgba(251, 191, 36, 0.7)) drop-shadow(0 2px 2px rgba(0,0,0,0.35)); }
        }
        .rank-pop {
          animation: rank-pop 0.35s ease-out both;
        }
        .rank-pop:nth-child(1) { animation-delay: 0.05s; }
        .rank-pop:nth-child(2) { animation-delay: 0.12s; }
        .rank-pop:nth-child(3) { animation-delay: 0.19s; }
        .rank-pop:nth-child(4) { animation-delay: 0.26s; }
        .rank-pop:nth-child(5) { animation-delay: 0.33s; }
        @keyframes rank-pop {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .xp-bar-fill { transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1); }
        .me-ring {
          box-shadow: 0 0 0 2px #a3e635, 0 0 12px rgba(163, 230, 53, 0.45);
        }
        /* Fire / flammable embers di podium */
        .ember-field {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          border-radius: inherit;
        }
        .ember-field::before {
          content: "";
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 48%;
          background: linear-gradient(
            180deg,
            transparent 0%,
            rgba(234, 88, 12, 0.08) 40%,
            rgba(234, 88, 12, 0.28) 75%,
            rgba(251, 146, 60, 0.45) 100%
          );
          animation: fire-breathe 1.6s ease-in-out infinite alternate;
          pointer-events: none;
        }
        @keyframes fire-breathe {
          from { opacity: 0.65; transform: scaleY(0.92); transform-origin: bottom; }
          to   { opacity: 1; transform: scaleY(1.06); transform-origin: bottom; }
        }
        .ember {
          position: absolute;
          bottom: -10px;
          width: 5px;
          height: 5px;
          border-radius: 50% 50% 50% 0;
          background: #f97316;
          box-shadow: 0 0 8px 2px rgba(249, 115, 22, 0.85), 0 0 16px rgba(251, 146, 60, 0.4);
          opacity: 0;
          animation: flame-rise linear infinite;
          transform: rotate(-45deg);
        }
        .ember.gold {
          background: #fbbf24;
          box-shadow: 0 0 8px 2px rgba(251, 191, 36, 0.9), 0 0 18px rgba(253, 224, 71, 0.45);
        }
        .ember.red {
          background: #ef4444;
          box-shadow: 0 0 8px 2px rgba(239, 68, 68, 0.8), 0 0 16px rgba(248, 113, 113, 0.4);
        }
        .ember.hot {
          width: 7px;
          height: 7px;
          background: #fde047;
          box-shadow: 0 0 12px 3px rgba(253, 224, 71, 0.95), 0 0 24px rgba(251, 191, 36, 0.5);
        }
        .ember:nth-child(1)  { left: 4%;  width: 4px; height: 4px; animation-duration: 1.4s; animation-delay: 0s; }
        .ember:nth-child(2)  { left: 11%; animation-duration: 1.8s; animation-delay: 0.15s; }
        .ember:nth-child(3)  { left: 18%; width: 3px; height: 3px; animation-duration: 1.2s; animation-delay: 0.4s; }
        .ember:nth-child(4)  { left: 26%; animation-duration: 1.6s; animation-delay: 0.05s; }
        .ember:nth-child(5)  { left: 34%; width: 6px; height: 6px; animation-duration: 2s; animation-delay: 0.55s; }
        .ember:nth-child(6)  { left: 42%; animation-duration: 1.3s; animation-delay: 0.25s; }
        .ember:nth-child(7)  { left: 50%; width: 3px; height: 3px; animation-duration: 1.7s; animation-delay: 0.7s; }
        .ember:nth-child(8)  { left: 57%; animation-duration: 1.5s; animation-delay: 0.1s; }
        .ember:nth-child(9)  { left: 65%; width: 6px; height: 6px; animation-duration: 1.9s; animation-delay: 0.35s; }
        .ember:nth-child(10) { left: 73%; animation-duration: 1.35s; animation-delay: 0.5s; }
        .ember:nth-child(11) { left: 81%; width: 4px; height: 4px; animation-duration: 1.75s; animation-delay: 0.2s; }
        .ember:nth-child(12) { left: 89%; animation-duration: 1.45s; animation-delay: 0.6s; }
        .ember:nth-child(13) { left: 96%; width: 3px; height: 3px; animation-duration: 1.55s; animation-delay: 0.3s; }
        .ember:nth-child(14) { left: 8%;  animation-duration: 1.25s; animation-delay: 0.8s; }
        .ember:nth-child(15) { left: 47%; animation-duration: 1.65s; animation-delay: 0.9s; }
        .ember:nth-child(16) { left: 70%; animation-duration: 1.15s; animation-delay: 0.45s; }
        @keyframes flame-rise {
          0% {
            transform: translateY(0) rotate(-45deg) scale(0.5);
            opacity: 0;
          }
          10% { opacity: 1; }
          40% {
            transform: translateY(-40px) rotate(-40deg) scale(0.95);
            opacity: 0.95;
          }
          70% {
            transform: translateY(-90px) rotate(-50deg) scale(0.7);
            opacity: 0.65;
          }
          100% {
            transform: translateY(-150px) rotate(-55deg) scale(0.15);
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ember { animation: none; opacity: 0; }
          .ember-field::before { animation: none; }
          .crown-glow { animation: none; }
        }
      `}</style>
      {/* ── Arena header ── */}
      <div className="arena-bg px-4 pt-4 pb-16 text-white">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h1 className="text-lg font-black text-white">Arena Poin</h1>
            <p className="text-[11px] text-white/55">Siapa yang naik peringkat minggu ini?</p>
          </div>
          {canGive && (
            <div className="flex items-center gap-1.5 shrink-0">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowQr((v) => !v)}
                  aria-label="QR Beri Poin"
                  aria-pressed={showQr}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border transition active:scale-[0.95] ${
                    showQr
                      ? "bg-lime text-deep border-lime shadow"
                      : "bg-white/10 text-acid border-white/20"
                  }`}
                >
                  <QrCode className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="flex items-center gap-1 bg-lime text-deep text-[10px] font-bold px-3 py-2 rounded-xl active:scale-[0.95] transition-transform shadow"
              >
                <Plus className="h-3.5 w-3.5" />
                Beri Poin
              </button>
            </div>
          )}
        </div>

        {/* Me card */}
        {me && (
          <button
            type="button"
            onClick={() => setDetailId(me.student_id)}
            className="mt-3 w-full flex items-center gap-3 rounded-2xl bg-white/10 border border-white/15 p-3 text-left active:scale-[0.98] transition-transform"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest text-lime text-[12px] font-black ring-2 ring-lime/50">
              <User className="h-5 w-5 opacity-80" strokeWidth={1.75} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-acid truncate">
                Peringkat Anda · #{myIndex + 1}
              </p>
              <div className="mt-1 h-1.5 bg-white/15 rounded-full overflow-hidden">
                <div
                  className="h-full bg-lime rounded-full xp-bar-fill"
                  style={{ width: `${Math.min(100, (me.total_points / maxPts) * 100)}%` }}
                />
              </div>
              <p className="mt-1 text-[9px] text-white/50">
                {me.total_points} poin · tap untuk alasan
              </p>
            </div>
            <Sparkles className="h-4 w-4 text-amber shrink-0" />
          </button>
        )}

        {/* QR panel — dibuka dari ikon di header */}
        {showQr && isAdmin && (
          <div className="mt-2 rounded-2xl bg-white p-4 flex flex-col items-center gap-2 border border-line">
            {qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qrDataUrl} alt="QR Beri Poin" className="w-44 h-44" />
            ) : (
              <p className="text-[11px] text-ink-soft/60 py-10">Menyiapkan QR…</p>
            )}
            <p className="text-[11px] font-semibold text-ink text-center">
              Scan → masuk sebagai guru → beri atau kurangi poin
            </p>
            <p className="text-[9px] text-ink-soft/60 text-center break-all">
              {getQrBaseUrl()}/app/scan
            </p>
            <p className="text-[9px] text-ink-soft/50">
              Cetak & tempel di kelas · hanya akun guru yang diizinkan
            </p>
          </div>
        )}
      </div>

      <div className="px-4 -mt-12 space-y-4">
        {error ? (
          <EmptyState icon={<Inbox className="h-6 w-6" />} message="Gagal memuat arena" />
        ) : (
          <>
            {/* Podium Top 3 */}
            {rows.length === 0 && (
              <div className="arena-bg rounded-2xl p-6 text-center border border-white/10">
                <Trophy className="h-10 w-10 text-amber mx-auto mb-2" />
                <p className="text-[12px] font-bold text-acid">Belum ada data poin</p>
                <p className="text-[10px] text-white/50 mt-1">
                  Belum ada siswa di Leaderboard
                </p>
              </div>
            )}
            {rows.length >= 1 && (
              <div className={`relative overflow-hidden bg-deep-2 rounded-2xl px-3 pt-3 pb-3 border border-white/5 ${podiumMuted ? "podium-muted" : ""}`}>
                {!podiumMuted && (
                  <div className="ember-field" aria-hidden="true">
                    <span className="ember red" />
                    <span className="ember gold" />
                    <span className="ember hot" />
                    <span className="ember" />
                    <span className="ember gold" />
                    <span className="ember red" />
                    <span className="ember" />
                    <span className="ember hot" />
                    <span className="ember gold" />
                    <span className="ember" />
                    <span className="ember red" />
                    <span className="ember gold" />
                    <span className="ember" />
                    <span className="ember hot" />
                    <span className="ember gold" />
                    <span className="ember red" />
                  </div>
                )}
                <div className="relative flex items-center justify-center gap-1.5 mb-1">
                  <Trophy className={`h-4 w-4 ${podiumMuted ? "text-white/40" : "text-amber"}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-[0.15em] ${podiumMuted ? "text-white/45" : "text-acid"}`}>
                    Leaderboard
                  </span>
                </div>
                {podiumMuted && (
                  <p className="relative text-center text-[9px] text-white/45 mb-1">
                    Belum ada selisih poin
                  </p>
                )}
                <div className="relative flex items-end justify-center gap-1.5">
                  {rows[1] && (
                    <PodiumCard
                      rank={2}
                      student={rows[1]}
                      isMe={rows[1].student_id === data?.studentId}
                      maxPts={maxPts}
                      muted={podiumMuted}
                      onOpen={() => setDetailId(rows[1].student_id)}
                    />
                  )}
                  {rows[0] && (
                    <PodiumCard
                      rank={1}
                      student={rows[0]}
                      isMe={rows[0].student_id === data?.studentId}
                      maxPts={maxPts}
                      muted={podiumMuted}
                      onOpen={() => setDetailId(rows[0].student_id)}
                    />
                  )}
                  {rows[2] && (
                    <PodiumCard
                      rank={3}
                      student={rows[2]}
                      isMe={rows[2].student_id === data?.studentId}
                      maxPts={maxPts}
                      muted={podiumMuted}
                      onOpen={() => setDetailId(rows[2].student_id)}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-surface rounded-xl p-1">
              {(
                [
                  ["peringkat", "Leaderboard"],
                  ["riwayat", "Battle Log"],
                  ["report", "Report"],
                ] as const
              ).map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={`py-1.5 rounded-lg text-[10px] sm:text-[11px] font-bold transition flex items-center justify-center gap-1.5 ${
                    tab === k ? "bg-forest text-white shadow-sm" : "text-ink-soft"
                  }`}
                >
                  {label}
                  {k === "report" && reportCount > 0 && (
                    <span
                      aria-hidden="true"
                      className="inline-flex h-[16px] w-[16px] items-center justify-center rounded-full bg-[#EEA34C] text-white text-[9px] font-medium leading-none"
                    >
                      {reportCount > 9 ? "9+" : reportCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {tab === "report" ? (
              <MassReportPanel />
            ) : tab === "peringkat" ? (
              <div>
                <SectionHeader title="Kejar Podium" count={String(rest.length)} />
                {rest.length === 0 ? (
                  <EmptyState
                    icon={<Flame className="h-6 w-6" />}
                    message="Belum ada yang di luar podium"
                  />
                ) : (
                  <div className="space-y-1.5">
                    {rest.map((p, idx) => {
                      const rank = idx + 4
                      const isMe = p.student_id === data?.studentId || p.full_name === meName
                      const above = rows[rank - 2]
                      const gap = above ? Math.max(0, above.total_points - p.total_points) : 0
                      const pct = maxPts > 0 ? Math.min(100, (p.total_points / maxPts) * 100) : 0
                      const last = lastLogByStudent.get(p.student_id)
                      const showPos =
                        p.position && p.position !== "ANGGOTA" ? p.position : null
                      return (
                        <button
                          key={p.student_id}
                          type="button"
                          onClick={() => setDetailId(p.student_id)}
                          className={`rank-pop w-full rounded-xl border p-2.5 text-left active:scale-[0.98] transition-transform ${
                            isMe
                              ? "bg-forest/8 border-lime/40 me-ring"
                              : "bg-white border-line shadow-sm"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-lg text-[12px] font-black shrink-0 ${
                                rank === 4
                                  ? "bg-amber/20 text-amber"
                                  : "bg-surface text-ink-soft"
                              }`}
                            >
                              {rank}
                            </span>
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-deep text-lime text-[11px] font-bold shrink-0">
                              <User className="h-4 w-4 opacity-80" strokeWidth={1.75} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <p className="text-[12px] font-semibold text-ink truncate">
                                  {personName(p.full_name)}
                                </p>
                                {isMe && (
                                  <span className="text-[8px] font-bold uppercase tracking-wide bg-forest text-white px-1 py-0 rounded shrink-0">
                                    Anda
                                  </span>
                                )}
                                {showPos && (
                                  <span className="text-[8px] font-bold uppercase bg-surface text-ink-soft px-1 py-0 rounded shrink-0">
                                    {showPos}
                                  </span>
                                )}
                                {/* Indikator naik/turun — inline nama, ujung bar */}
                                <span className="flex-1" />
                                {last && (
                                  <span
                                    className={`shrink-0 flex h-4 w-4 items-center justify-center ${
                                      last.delta > 0 ? "text-forest/70" : "text-alert/70"
                                    }`}
                                    aria-label={last.delta > 0 ? "Poin naik" : "Poin turun"}
                                  >
                                    <GameDeltaIcon up={last.delta > 0} />
                                  </span>
                                )}
                              </div>
                              <div className="mt-1.5 h-1.5 bg-surface rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full xp-bar-fill bg-gradient-to-r from-forest to-lime"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="mt-1 flex items-center justify-between gap-2">
                                <p className="text-[9px] text-ink-soft/60 truncate">
                                  {last ? last.reason : "Belum ada aktivitas"}
                                </p>
                                <span
                                  className={`text-[9px] font-semibold shrink-0 ${
                                    gap === 0 ? "text-forest" : "text-ink-soft/50"
                                  }`}
                                >
                                  {gap === 0 ? "≈ podium" : `+${gap}`}
                                </span>
                              </div>
                            </div>
                            {/* Panel skor khusus */}
                            <div
                              className={`shrink-0 w-14 rounded-xl px-1.5 py-1.5 flex flex-col items-center justify-center border ${
                                isMe
                                  ? "bg-deep border-lime/50 shadow-[0_0_10px_rgba(163,230,53,0.25)]"
                                  : "bg-deep border-white/10"
                              }`}
                            >
                              <span className="text-[7px] font-bold uppercase tracking-[0.18em] text-white/40 leading-none">
                                PTS
                              </span>
                              <span
                                className={`mt-0.5 text-[15px] font-black tabular-nums leading-none ${
                                  isMe ? "text-lime" : "text-acid"
                                }`}
                              >
                                {p.total_points}
                              </span>
                              <span className="mt-0.5 h-px w-8 bg-gradient-to-r from-transparent via-amber/50 to-transparent" />
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <SectionHeader
                  title="Aktivitas terbaru"
                  count={String(data?.recent?.length ?? 0)}
                />
                <HistoryList items={data?.recent ?? []} showStudent />
              </div>
            )}
          </>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-lime text-deep text-[11px] font-black px-4 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Detail histori */}
      <Sheet
        open={Boolean(detailId)}
        onClose={() => setDetailId(null)}
        title={formatDisplayName(detail?.student?.full_name) || "Riwayat poin"}
      >
        {detail?.student && (
          <div className="arena-bg rounded-xl p-3 text-white flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/55">Total skor</p>
              <p className="text-2xl font-black text-acid leading-none">
                {detail.student.total_points}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-amber font-bold">
                #{(rows.findIndex((r) => r.student_id === detail.student!.student_id) + 1) || "?"}
              </p>
              <p className="text-[9px] text-white/50">
                {detail.student.position !== "ANGGOTA"
                  ? detail.student.position
                  : "Siswa"}
              </p>
            </div>
          </div>
        )}
        <div>
          <p className="text-[11px] font-semibold text-ink mb-1.5">
            Alasan penambahan / pengurangan poin?
          </p>
          <HistoryList items={detail?.history ?? []} />
        </div>
      </Sheet>

      {/* Form beri poin */}
      <Sheet open={open} onClose={() => setOpen(false)} title="Beri Poin" fullHeight>
        {err && (
          <p className="text-sm text-alert bg-alert-bg border border-alert/20 rounded-xl px-3 py-2">
            {err}
          </p>
        )}

        <FormSectionCard
          title="Form Beri Poin"
          subtitle="Siswa, tipe, alasan, skor"
        >
          <Field
            label="Siswa"
            hint={studentIds.length > 0 ? `${studentIds.length} terpilih` : undefined}
          >
            <StudentMultiSelect
              students={students ?? []}
              selectedIds={studentIds}
              selectedNames={selectedNames}
              onChange={(ids) => setStudentIds(ids)}
              placeholder="Pilih Nama Siswa"
              selectAllLabel="Pilih Semua"
              selectAllMode="all"
            />
          </Field>

          <div className="space-y-1.5">
            <span className="text-sm font-semibold text-ink">Tipe</span>
            <div className="grid grid-cols-2 gap-2">
              {(["PRESTASI", "PELANGGARAN"] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`flex items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold border transition active:scale-[0.97] ${
                    k === "PELANGGARAN"
                      ? kind === k
                        ? "bg-alert text-white border-alert ring-2 ring-alert/35"
                        : "bg-alert/15 text-alert border-alert/35"
                      : kind === k
                        ? "bg-forest text-white border-forest"
                        : "bg-white text-ink border-line"
                  }`}
                >
                  {k === "PRESTASI" ? (
                    <Trophy className="h-4 w-4" />
                  ) : (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  {k === "PRESTASI" ? "Prestasi" : "Pelanggaran"}
                </button>
              ))}
            </div>
          </div>

          <div className="relative w-full min-w-0 space-y-1.5">
            <span className="text-sm font-semibold text-ink">Alasan Cepat</span>
            <button
              type="button"
              onClick={() => setQuickOpen((v) => !v)}
              aria-expanded={quickOpen}
              className="min-h-11 w-full flex items-center gap-2 rounded-lg border border-forest/40 bg-white px-3 text-left focus:outline-none focus:ring-2 focus:ring-forest/25 focus:border-forest"
            >
              <span
                className={`min-w-0 flex-1 truncate text-sm font-medium ${
                  reason.trim() ? "text-ink" : "text-ink-soft/60"
                }`}
              >
                {reason.trim() || "Pilih alasan cepat…"}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${
                  quickOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {quickOpen && (
              <div
                role="listbox"
                aria-label="Alasan cepat"
                className="absolute left-0 right-0 top-full z-30 mt-1 w-full max-h-[16rem] overflow-y-auto scroll-y-only bg-white border border-line rounded-xl shadow-lg py-1"
              >
                {POINT_PRESETS[kind as PointPresetKind].map((p) => {
                  const active = reason.trim() === p.label
                  const sign = kind === "PRESTASI" ? "+" : "−"
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setReason(p.label)
                        setAmount(Math.abs(p.delta))
                        setQuickOpen(false)
                      }}
                      className="flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left active:bg-surface"
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          active
                            ? "border-forest bg-forest text-white"
                            : "border-line bg-white"
                        }`}
                      >
                        {active && <Check className="h-2.5 w-2.5" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">
                        {p.label}
                      </span>
                      <span className="shrink-0 text-xs font-bold tabular-nums text-ink-soft/70">
                        {sign}
                        {Math.abs(p.delta)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <Field label="Skor">
            {/* Pill tetap flex-1 · −/+ manual membatalkan listening Alasan Cepat */}
            <div className="flex w-full items-center gap-1">
              <button
                type="button"
                aria-label="Kurangi skor"
                onClick={() => {
                  setReason("")
                  setQuickOpen(false)
                  setAmount((v) => Math.max(1, (Number(v) || 0) - 1))
                }}
                className="flex h-11 w-10 shrink-0 items-center justify-center rounded-lg text-ink-soft transition-colors active:bg-surface active:text-ink"
              >
                <Minus className="h-4 w-4" strokeWidth={2.5} />
              </button>

              <div
                className={`flex min-w-0 flex-1 items-center justify-center gap-0.5 h-11 rounded-full bg-deep px-3 shadow-sm ring-1 ${
                  kind === "PRESTASI" ? "ring-lime/25" : "ring-alert/30"
                }`}
              >
                <span
                  className={`shrink-0 text-[15px] font-black leading-none tabular-nums ${
                    kind === "PRESTASI" ? "text-lime" : "text-alert"
                  }`}
                >
                  {kind === "PRESTASI" ? "+" : "−"}
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={100}
                  value={amount === 0 ? "" : amount}
                  placeholder="2"
                  aria-label="Skor"
                  onChange={(e) => {
                    const raw = e.target.value
                    if (raw === "") {
                      setAmount(0)
                      return
                    }
                    const n = Number(raw)
                    if (Number.isFinite(n)) {
                      setAmount(Math.max(0, Math.min(100, Math.floor(n))))
                    }
                  }}
                  className="w-8 shrink-0 bg-transparent text-center text-[16px] font-black text-acid tabular-nums outline-none placeholder:text-white/30 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                />
              </div>

              <button
                type="button"
                aria-label="Tambah skor"
                onClick={() => {
                  setReason("")
                  setQuickOpen(false)
                  setAmount((v) => Math.min(100, (Number(v) || 0) + 1))
                }}
                className="flex h-11 w-10 shrink-0 items-center justify-center rounded-lg text-ink-soft transition active:scale-90 active:bg-surface active:text-ink"
              >
                <Plus className="h-4 w-4" strokeWidth={2.5} />
              </button>
            </div>
          </Field>

          <Field label="Alasan" hint="Wajib — tampil di Battle Log semua siswa">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder={
                kind === "PRESTASI"
                  ? "Perfect Score DT Matematika…"
                  : "Tidak mengerjakan piket hari ini…"
              }
              className="min-h-11 w-full resize-none scroll-y-only rounded-xl border border-forest/45 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/45 focus:outline-none focus:ring-2 focus:ring-forest/25 focus:border-forest"
            />
          </Field>
        </FormSectionCard>

        <button
          type="button"
          disabled={saving}
          onClick={() => void submit()}
          className="flex w-full items-center justify-center gap-1.5 rounded-full bg-forest px-3 py-3 text-sm font-semibold text-white active:scale-[0.97] transition-transform disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {saving ? "Menyimpan…" : "Beri Poin"}
        </button>
      </Sheet>

      <div className="h-4" />
    </div>
  )
}
