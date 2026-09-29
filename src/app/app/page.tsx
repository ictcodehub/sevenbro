"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import {
  CalendarDays,
  Megaphone,
  Pin,
  Trophy,
  Wallet,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react"
import {
  SectionHeader,
  ListRow,
} from "@/components/ui-primitives"
import { useAppSWR } from "@/lib/fetcher"
import { formatIDR, formatDateID, formatTimeID, formatDisplayName } from "@/lib/format"
import { RoleGate } from "@/components/RoleGate"
import { useT } from "@/lib/i18n"
import { PodiumCard } from "@/components/PodiumCard"

type Announcement = {
  id: string
  title: string
  body: string
  pinned: boolean
  created_at: string
}

type EventRow = {
  id: string
  title: string
  location: string | null
  starts_at: string
}

type Summary = {
  balance: number
  recent: unknown[]
  month: { title: string; amount: number } | null
  paidCount: number
  totalCount: number
  monthIn: number
  monthOut: number
  lastActivity: {
    kind: string
    at: string
    by: string
    label: string
    amount: number
    direction?: "IN" | "OUT"
  } | null
}

type PointsPayload = {
  leaderboard: { student_id: string; full_name: string; total_points: number }[]
  studentId: string | null
}

function firstName(full: string) {
  const w = full.trim().split(/\s+/)
  return w[0] || full
}

/** Hanya untuk kartu Beranda — buang “ - Senin, 21 September 2026” dari judul */
function homeTitle(title: string) {
  const i = title.indexOf(" - ")
  return i > 0 ? title.slice(0, i) : title
}

/** Hanya untuk kartu Beranda — buang *bold* jadi teks polos (source tidak diubah) */
function homeBody(body: string) {
  return body.replace(/\*([^*\n]+)\*/g, "$1")
}

/** True bila teks melebihi 2 baris (untuk tampilkan .... di baris 3) */
function useOverflow2Lines() {
  const ref = useRef<HTMLParagraphElement>(null)
  const [overflow, setOverflow] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      // 2 baris ≈ 2 × line-height
      const styles = window.getComputedStyle(el)
      const lh = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * 1.45
      setOverflow(el.scrollHeight > lh * 2 + 1)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return { ref, overflow }
}

const HOME_ROLES = ["HOMEROOM", "KETUA", "BENDAHARA", "SEKRETARIS", "ANGGOTA"]

export default function HomePage() {
  return (
    <RoleGate allow={HOME_ROLES}>
      <HomeInner />
    </RoleGate>
  )
}

function HomeInner() {
  const t = useT()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const displayName = firstName(formatDisplayName(session?.user?.name) || "Kelas")
  // Info & Agenda: dibuka untuk semua siswa aktif
  const { data: announcements } = useAppSWR<Announcement[]>("/api/announcements")
  const { data: events } = useAppSWR<EventRow[]>("/api/events")
  const { data: kas } = useAppSWR<Summary>("/api/kas/summary")
  const { data: points } = useAppSWR<PointsPayload>("/api/points")
  const bodyClip = useOverflow2Lines()

  const pinned =
    (announcements ?? []).find((a) => a.pinned) ?? (announcements ?? [])[0]
  // Agenda Terdekat → hanya yang belum lewat, tanggal terdekat di atas
  const nowMs = Date.now()
  const upcoming = (events ?? [])
    .filter((e) => +new Date(e.starts_at) >= nowMs)
    .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at))
    .slice(0, 3)
  const top3 = (points?.leaderboard ?? []).slice(0, 3)
  const totalSiswa = points?.leaderboard?.length ?? 0
  // Mati kalau top skor masih seri
  const podiumMuted =
    top3.length >= 2 && top3.every((p) => p.total_points === top3[0]!.total_points)

  return (
    <div className="px-4 py-3 space-y-3">
      {/* ── Sapaan ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-ink">{t("home.greeting", { name: displayName })}</h1>
          <p className="text-xs text-ink-soft/75">
            {t("home.subtitle")}
          </p>
        </div>
        <span className="text-[10px] font-semibold text-forest bg-forest/10 px-2 py-1 rounded-full shrink-0">
          {totalSiswa > 0 ? t("home.students", { n: totalSiswa }) : "7B"}
        </span>
      </div>

      {/* ── Podium Top 3 — leaderboard ── */}
      <Link href="/app/poin" className="block active:scale-[0.99] transition-transform">
        <div
          className={`relative overflow-hidden bg-deep-2 border border-white/5 rounded-2xl p-3 ${
            podiumMuted ? "podium-muted" : ""
          }`}
        >
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

          <div className="relative flex items-center justify-center gap-1.5 mb-2">
            <Trophy className={`h-4 w-4 ${podiumMuted ? "text-white/40" : "text-amber"}`} />
            <span
              className={`text-xs font-bold uppercase tracking-[0.15em] ${
                podiumMuted ? "text-white/45" : "text-acid"
              }`}
            >
              {t("poin.leaderboard")}
            </span>
          </div>

          {top3.length === 0 ? (
            <p className="relative text-xs text-white/50 py-4 text-center">Belum ada poin</p>
          ) : (
            <>
              <div className="relative flex items-end justify-center gap-1.5">
                {top3[1] && (
                  <PodiumCard
                    rank={2}
                    student={top3[1]}
                    muted={podiumMuted}
                    isMe={top3[1].student_id === points?.studentId}
                  />
                )}
                {top3[0] && (
                  <PodiumCard
                    rank={1}
                    student={top3[0]}
                    muted={podiumMuted}
                    isMe={top3[0].student_id === points?.studentId}
                  />
                )}
                {top3[2] && (
                  <PodiumCard
                    rank={3}
                    student={top3[2]}
                    muted={podiumMuted}
                    isMe={top3[2].student_id === points?.studentId}
                  />
                )}
              </div>
              {podiumMuted && (
                <p className="relative text-center text-[11px] text-white/45 mt-2">
                  {t("home.noDiff")}
                </p>
              )}
            </>
          )}
        </div>
      </Link>

      {/* ── Disematkan / terbaru — semua siswa ── */}
      {pinned ? (
        <Link
          href="/app/pengumuman"
          className="block active:scale-[0.99] transition-transform"
        >
          <div className="bg-deep rounded-2xl p-4 text-white">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-sm font-bold leading-tight min-w-0 flex-1">
                {homeTitle(pinned.title)}
              </h3>
              <span className="inline-flex shrink-0 items-center gap-1 bg-amber/20 text-amber rounded-full px-1.5 py-0.5 text-[10px] font-bold mt-0.5">
                <Pin className="h-3 w-3" />
                {pinned.pinned ? t("home.pinned") : t("home.latest")}
              </span>
            </div>
            <p
              ref={bodyClip.ref}
              className="text-sm-plus text-white/65 leading-relaxed whitespace-pre-wrap overflow-hidden"
              style={{ maxHeight: "calc(2 * 1.45em)" }}
            >
              {homeBody(pinned.body)}
            </p>
            {bodyClip.overflow && (
              <p className="text-sm-plus text-white/65 leading-relaxed">....</p>
            )}
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-xs text-acid font-semibold flex items-center gap-0.5">
                {t("home.readMore")} <ArrowRight className="h-3.5 w-3.5" />
              </span>
              <Megaphone className="h-4 w-4 text-white/30" />
            </div>
          </div>
        </Link>
      ) : (
        <div className="bg-deep rounded-2xl p-4 text-white flex items-center justify-between">
          <div>
            <p className="text-xs text-white/55">{t("home.noAnnouncement")}</p>
            <p className="text-xs font-bold text-acid mt-0.5">{t("home.checkInfo")}</p>
          </div>
          <Megaphone className="h-7 w-7 text-white/30" />
        </div>
      )}

      {/* ── Saldo Kas Kelas ── */}
      <Link href="/app/kas" className="block active:scale-[0.99] transition-transform">
        <div className="bg-deep rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-white/70">
              <Wallet className="h-3.5 w-3.5" />
              {t("home.cashBalance")}
            </span>
            <span className="inline-flex items-center gap-0.5 text-xs text-acid">
              <ArrowUpRight className="h-3.5 w-3.5" />
              {t("home.viewCash")}
            </span>
          </div>
          <p className="text-2xl font-bold leading-none text-acid">
            {formatIDR(kas?.balance ?? 0)}
          </p>
          <div className="mt-2 flex flex-nowrap items-center gap-1 min-w-0">
            <span className="inline-flex items-center gap-0.5 rounded-full bg-lime/15 border border-lime/30 px-1.5 py-0.5 text-[10px] font-semibold text-lime min-w-0 truncate">
              ↑ {formatIDR(kas?.monthIn ?? 0)}
            </span>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-amber/15 border border-amber/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber min-w-0 truncate">
              ↓ {formatIDR(kas?.monthOut ?? 0)}
            </span>
          </div>
        </div>
      </Link>

      {/* ── Agenda — semua siswa aktif ── */}
      <div>
        <SectionHeader
          title={t("home.upcomingAgenda")}
          count={events?.length ?? 0}
          action={{ href: "/app/agenda", label: t("home.all") }}
        />
        <div className="space-y-1.5 mt-1">
          {upcoming.map((e, i) => (
            <ListRow
              key={e.id}
              icon={<CalendarDays className="h-3.5 w-3.5 text-forest" />}
              title={e.title}
              subtitle={e.location || "-"}
              rightTop={formatTimeID(new Date(e.starts_at))}
              rightBottom={formatDateID(new Date(e.starts_at))}
              href="/app/agenda"
              accent={i === 0}
            />
          ))}
          {upcoming.length === 0 && (
            <div className="bg-white border border-line shadow-sm rounded-xl p-3 text-center text-xs text-ink-soft/60">
              {t("home.noAgenda")}
            </div>
          )}
        </div>
      </div>

      <div className="h-2" />
    </div>
  )
}
