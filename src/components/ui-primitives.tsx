// ============================================================
// UI Primitives — SSOT
// Patterns from docs/DESIGN_SYSTEM.md. Prefer these over raw Tailwind.
// ============================================================

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRight, Check, Clock, MapPin } from "lucide-react"

// ── Section Header ──
export function SectionHeader({
  title,
  action,
  count,
}: {
  title: string
  count?: number | string
  action?: { href: string; label: string }
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {action ? (
        <Link
          href={action.href}
          className="text-xs text-ink-soft/75 hover:text-ink-soft flex items-center gap-0.5"
        >
          {action.label} <ArrowRight className="h-3 w-3" />
        </Link>
      ) : count !== undefined ? (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-forest text-white text-[11px] font-bold px-2 py-0.5 tabular-nums"
          title={`${count}`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-lime" />
          {count}
        </span>
      ) : null}
    </div>
  )
}

// ── Section Card (frame Info — header bar bg-page + body putih) ──
export function SectionCard({
  title,
  count,
  children,
}: {
  title: string
  count?: number | string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-page px-3 py-2.5">
        <p className="text-sm font-bold text-ink truncate">{title}</p>
        {count !== undefined && (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-forest text-white text-[11px] font-bold px-2 py-0.5 tabular-nums shrink-0"
            title={`${count}`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-lime" />
            {count}
          </span>
        )}
      </div>
      <div className="p-3 space-y-2">{children}</div>
    </div>
  )
}

// ── Stat Card ──
export function StatCard({
  href,
  icon,
  label,
  value,
  tone = "forest",
}: {
  href: string
  icon: ReactNode
  label: string
  value: string
  tone?: "forest" | "amber" | "lime" | "blue"
}) {
  const toneClass = {
    forest: "text-forest",
    amber: "text-amber",
    lime: "text-lime",
    blue: "text-blue-500",
  }[tone]

  return (
    <Link href={href} className="flex-1 active:scale-[0.97] transition-transform">
      <div className="bg-white border border-line shadow-sm rounded-2xl p-3 h-full flex flex-col justify-between">
        <span className={toneClass}>{icon}</span>
        <div>
          <p className="text-sm-plus font-medium text-ink">{label}</p>
          <p className="text-xs text-ink-soft/75">{value}</p>
        </div>
      </div>
    </Link>
  )
}

// ── List Row (dense, white card) ──
export function ListRow({
  icon,
  title,
  subtitle,
  rightTop,
  rightBottom,
  href,
  accent,
}: {
  icon: ReactNode
  title: string
  subtitle: string
  rightTop?: string
  rightBottom?: string
  href?: string
  /** Accent tipis di kiri — item terdekat */
  accent?: boolean
}) {
  const body = (
    <div
      className={`border shadow-sm rounded-xl p-2.5 flex items-center gap-2.5 ${
        accent
          ? "border-lime/50 bg-lime/20 accent-pulse"
          : "border-line bg-white"
      }`}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${accent ? "text-forest" : "text-ink"}`}>
          {title}
        </p>
        <div className={`flex items-center gap-1 text-[11px] ${accent ? "text-forest/75" : "text-ink-soft/75"}`}>
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{subtitle}</span>
        </div>
      </div>
      {(rightTop || rightBottom) && (
        <div className="text-right shrink-0">
          {rightTop && (
            <p className={`text-xs font-bold ${accent ? "text-forest" : "text-ink"}`}>
              {rightTop}
            </p>
          )}
          {rightBottom && (
            <p className={`text-[10px] ${accent ? "text-forest/70" : "text-ink-soft/75"}`}>
              {rightBottom}
            </p>
          )}
        </div>
      )}
    </div>
  )

  return href ? (
    <Link href={href} className="block active:scale-[0.98] transition-transform">
      {body}
    </Link>
  ) : (
    body
  )
}

// ── Timeline Item — node sejajar meta · rail sampai lokasi ──
export function TimelineItem({
  time,
  timeEnd,
  title,
  location,
  description,
  isActive,
  isLast,
  actions,
}: {
  time: string
  timeEnd?: string
  title: string
  location: string
  description?: string | null
  isActive?: boolean
  isLast?: boolean
  actions?: ReactNode
}) {
  const plainDesc = description
    ? description
        .replace(/\*([^*\n]+)\*/g, "$1")
        .replace(/\s+/g, " ")
        .trim()
    : null

  return (
    <div className={`min-w-0 ${isLast ? "pb-2" : "pb-6"}`}>
      {/* Baris 1: node · tanggal — aksi absolute sejajar tanggal */}
      <div className="relative flex items-center gap-2 pr-16">
        <span
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full ring-2 ${
            isActive
              ? "bg-forest ring-white"
              : "border border-forest/50 bg-white ring-white"
          }`}
          aria-hidden
        >
          {isActive ? (
            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-forest" />
          )}
        </span>
        <p
          className={`min-w-0 flex-1 text-[11px] font-medium leading-snug truncate ${
            isActive ? "text-forest" : "text-ink-soft/65"
          }`}
        >
          {time}
          {timeEnd ? ` — ${timeEnd}` : ""}
        </p>
        {actions && (
          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-0">
            {actions}
          </div>
        )}
      </div>

      {/* Judul — jarak seperti sebelumnya */}
      <div className="mt-1 pl-6">
        <h3
          className={`text-sm font-semibold leading-snug truncate ${
            isActive ? "text-forest" : "text-ink"
          }`}
        >
          {title}
        </h3>
        {plainDesc && (
          <p
            className={`mt-1 text-sm-plus leading-relaxed line-clamp-2 ${
              isActive ? "text-forest/80" : "text-ink-soft/70"
            }`}
          >
            {plainDesc}
          </p>
        )}
        <p
          className={`mt-2 flex items-center gap-1 text-[11px] leading-snug min-w-0 ${
            isActive ? "text-forest/85" : "text-ink-soft/75"
          }`}
        >
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="min-w-0 truncate">{location}</span>
        </p>
      </div>
    </div>
  )
}

export function Timeline({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      {/* Rail — center node h-4 → left 7px (w-4/2 - 0.5) */}
      <div
        aria-hidden
        className="absolute left-[7px] top-2 bottom-2 w-0.5 rounded-full bg-forest/25"
      />
      <div className="relative">{children}</div>
    </div>
  )
}

// ── Empty State ──
export function EmptyState({ icon, message }: { icon: ReactNode; message: string }) {
  return (
    <div className="bg-white border border-line shadow-sm rounded-2xl py-6 text-center">
      <div className="flex justify-center mb-1 text-ink-soft/40">{icon}</div>
      <p className="text-sm-plus text-ink-soft/75">{message}</p>
    </div>
  )
}

// ── Dark card text helper (labels only — content stays white/acid) ──
// Label: white/55 · Meta number/time: acid · Body: white/70 · Muted: white/45

// ── Dark Hero Card ──
export function HeroCard({
  eyebrow,
  meta,
  title,
  location,
  description,
}: {
  eyebrow: string
  meta?: string
  title: string
  location: string
  description?: string
}) {
  return (
    <div className="bg-deep rounded-2xl p-4 text-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-medium text-white/70">
          <Clock className="h-3.5 w-3.5" />
          {eyebrow}
        </div>
        {meta && <span className="text-xs font-medium text-acid">{meta}</span>}
      </div>
      <h3 className="text-sm font-bold leading-tight mb-1.5">{title}</h3>
      <div className="flex items-center gap-1 text-xs text-acid">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{location}</span>
      </div>
      {description && (
        <p className="text-sm-plus text-white/65 leading-relaxed mt-2 pt-2 border-t border-white/10">
          {description}
        </p>
      )}
    </div>
  )
}

// ── Progress Card (checklists / goals / completion) ──
export function ProgressCard({
  eyebrow,
  value,
  sub,
  doneLabel,
  percent,
}: {
  eyebrow: ReactNode
  value: number | string
  sub?: string
  doneLabel: string
  percent: number
}) {
  return (
    <div className="bg-deep rounded-2xl p-4 text-white">
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-white/55">
          {eyebrow}
        </div>
        <span className="text-xs text-white/55">{doneLabel}</span>
      </div>
      <p className="text-2xl font-bold leading-none mb-2.5 text-acid">
        {value}
        {sub && <span className="text-base text-white/45">{sub}</span>}
      </p>
      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-lime rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}
