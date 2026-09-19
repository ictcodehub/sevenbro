"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import {
  CalendarDays,
  Megaphone,
  Pin,
  Star,
  Trophy,
  Wallet,
  ArrowRight,
  Crown,
  Award,
} from "lucide-react"
import {
  SectionHeader,
  ListRow,
} from "@/components/ui-primitives"
import { useAppSWR } from "@/lib/fetcher"
import { formatIDR, formatDateID, formatTimeID, formatDisplayName } from "@/lib/format"
import { RoleGate } from "@/components/RoleGate"

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
}

const MEDAL = [
  {
    chip: "bg-amber text-white",
    ring: "ring-amber/40 bg-amber/10",
    icon: Trophy,
    label: "Juara 1",
    note: "Terbaik",
  },
  {
    chip: "bg-ink-soft text-white",
    ring: "ring-ink-soft/30 bg-surface",
    icon: Award,
    label: "Juara 2",
    note: "Hebat",
  },
  {
    chip: "bg-amber/70 text-white",
    ring: "ring-amber/25 bg-amber/5",
    icon: Star,
    label: "Juara 3",
    note: "Bagus",
  },
] as const

function firstName(full: string) {
  const w = full.trim().split(/\s+/)
  return w[0] || full
}

/** Nama utuh di kartu — jangan potong nama tengah (mis. Li Ming Xin) */
function personName(full: string) {
  return formatDisplayName(full)
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
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const displayName = firstName(formatDisplayName(session?.user?.name) || "Kelas")
  // Info & Agenda: dibuka untuk semua siswa aktif
  const { data: announcements } = useAppSWR<Announcement[]>("/api/announcements")
  const { data: events } = useAppSWR<EventRow[]>("/api/events")
  const { data: kas } = useAppSWR<Summary>("/api/kas/summary")
  const { data: points } = useAppSWR<PointsPayload>("/api/points")

  const pinned =
    (announcements ?? []).find((a) => a.pinned) ?? (announcements ?? [])[0]
  const upcoming = (events ?? []).slice(0, 3)
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
          <h1 className="text-lg font-bold text-ink">Halo {displayName}</h1>
          <p className="text-[11px] text-ink-soft/75">
            Ringkasan informasi & aktivitas kelas
          </p>
        </div>
        <span className="text-[10px] font-semibold text-forest bg-forest/10 px-2 py-1 rounded-full">
          {totalSiswa > 0 ? `${totalSiswa} siswa` : "7B"}
        </span>
      </div>

      {/* ── Disematkan / terbaru — semua siswa ── */}
      {pinned ? (
        <Link
          href="/app/pengumuman"
          className="block active:scale-[0.99] transition-transform"
        >
          <div className="bg-deep rounded-2xl p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1 bg-amber/20 text-amber rounded-full px-2 py-0.5 text-[9px] font-bold">
                <Pin className="h-2.5 w-2.5" />
                {pinned.pinned ? "Disematkan" : "Terbaru"}
              </span>
              <span className="text-[10px] text-white/45">Info kelas</span>
            </div>
            <h3 className="text-sm font-bold leading-tight mb-1">
              {pinned.title}
            </h3>
            <p className="text-[11px] text-white/65 leading-relaxed line-clamp-2">
              {pinned.body}
            </p>
            <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-acid font-semibold flex items-center gap-0.5">
                Baca selengkapnya <ArrowRight className="h-3 w-3" />
              </span>
              <Megaphone className="h-4 w-4 text-white/30" />
            </div>
          </div>
        </Link>
      ) : (
        <div className="bg-deep rounded-2xl p-4 text-white flex items-center justify-between">
          <div>
            <p className="text-[10px] text-white/55">Tidak ada pengumuman</p>
            <p className="text-sm font-bold text-acid mt-0.5">Cek Info untuk update</p>
          </div>
          <Megaphone className="h-7 w-7 text-white/30" />
        </div>
      )}

      {/* ── Saldo Kas Kelas ── */}
      <Link href="/app/kas" className="block active:scale-[0.99] transition-transform">
        <div className="bg-deep rounded-2xl p-4 text-white">
          <div className="flex items-center justify-between mb-1.5">
            <span className="flex items-center gap-1.5 text-[10px] font-medium text-white/70">
              <Wallet className="h-3 w-3" />
              Saldo Kas Kelas
            </span>
            <span className="text-[10px] text-acid">Lihat kas</span>
          </div>
          <p className="text-2xl font-bold leading-none text-acid">
            {formatIDR(kas?.balance ?? 0)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-lime/15 border border-lime/30 px-2 py-0.5 text-[9px] font-semibold text-lime">
              + {formatIDR(kas?.monthIn ?? 0)} Masuk
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber/15 border border-amber/30 px-2 py-0.5 text-[9px] font-semibold text-amber">
              − {formatIDR(kas?.monthOut ?? 0)} Keluar
            </span>
          </div>
        </div>
      </Link>

      {/* ── Podium Top 3 — piala & bintang ── */}
      <Link href="/app/poin" className="block active:scale-[0.99] transition-transform">
        <div className="bg-white border border-line shadow-sm rounded-2xl p-3.5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${podiumMuted ? "bg-surface" : "bg-amber/15"}`}>
                <Trophy className={`h-3.5 w-3.5 ${podiumMuted ? "text-ink-soft/50" : "text-amber"}`} />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-ink">Peringkat Poin</h2>
                <p className="text-[9px] text-ink-soft/60">
                  {podiumMuted ? "Belum ada selisih poin" : "Top 3 kelas 7B"}
                </p>
              </div>
            </div>
            <div className={`flex items-center gap-0.5 ${podiumMuted ? "text-ink-soft/30" : "text-amber"}`}>
              <Star className={`h-3 w-3 ${podiumMuted ? "" : "fill-amber"}`} />
              <Star className={`h-3 w-3 ${podiumMuted ? "" : "fill-amber"}`} />
              <Star className="h-3 w-3" />
            </div>
          </div>

          {top3.length === 0 ? (
            <p className="text-[10px] text-ink-soft/60 py-2 text-center">
              Belum ada poin
            </p>
          ) : podiumMuted ? (
            <div className="rounded-xl border border-dashed border-line bg-surface/40 px-3 py-4 text-center">
              <p className="text-[12px] font-bold text-ink-soft/60">—  ·  —  ·  —</p>
              <p className="text-[9px] text-ink-soft/55 mt-1.5">
                Belum ada selisih poin
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Juara 1 dulu — lebih menonjol */}
              {(() => {
                const p = top3[0]
                const m = MEDAL[0]
                const Icon = m.icon
                return (
                  <div className={`flex items-center gap-2.5 rounded-xl p-2.5 ring-1 ${m.ring}`}>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${m.chip} shadow-sm`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <Crown className="h-3 w-3 text-amber shrink-0" />
                        <p className="text-[12px] font-bold text-ink truncate">
                          {personName(p.full_name)}
                        </p>
                      </div>
                      <p className="text-[9px] text-ink-soft/70">{m.label} · {m.note}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-forest leading-none">
                        {p.total_points}
                      </p>
                      <p className="text-[9px] text-ink-soft/60">poin</p>
                    </div>
                  </div>
                )
              })()}

              {/* Juara 2 & 3 */}
              <div className="grid grid-cols-2 gap-2">
                {top3.slice(1, 3).map((p, idx) => {
                  const m = MEDAL[idx + 1]
                  const Icon = m.icon
                  return (
                    <div
                      key={p.student_id}
                      className={`rounded-xl p-2.5 ring-1 ${m.ring} flex flex-col gap-1.5`}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${m.chip}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <Star className="h-3 w-3 text-amber/70 fill-amber/40" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-ink truncate">
                          {personName(p.full_name)}
                        </p>
                        <p className="text-[9px] text-ink-soft/60">{m.label}</p>
                      </div>
                      <p className="text-[11px] font-bold text-forest">
                        {p.total_points} <span className="font-medium text-ink-soft/60">poin</span>
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mt-3 pt-2 border-t border-line/40">
            <span className="text-[10px] text-forest font-semibold flex items-center gap-0.5">
              Lihat semua <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        </div>
      </Link>

      {/* ── Agenda — semua siswa aktif ── */}
      <div>
        <SectionHeader
          title="Agenda Terdekat"
          count={events?.length ?? 0}
          action={{ href: "/app/agenda", label: "Semua" }}
        />
        <div className="space-y-1.5">
          {upcoming.map((e) => (
            <ListRow
              key={e.id}
              icon={<CalendarDays className="h-3.5 w-3.5 text-forest" />}
              title={e.title}
              subtitle={e.location || "-"}
              rightTop={formatTimeID(new Date(e.starts_at))}
              rightBottom={formatDateID(new Date(e.starts_at))}
              href="/app/agenda"
            />
          ))}
          {upcoming.length === 0 && (
            <div className="bg-white border border-line shadow-sm rounded-xl p-3 text-center text-[10px] text-ink-soft/60">
              Belum ada agenda
            </div>
          )}
        </div>
      </div>

      <div className="h-2" />
    </div>
  )
}
