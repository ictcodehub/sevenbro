// ============================================================
// UI Primitives — SSOT
// Patterns from docs/DESIGN_SYSTEM.md. Prefer these over raw Tailwind.
// ============================================================

import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Clock, MapPin } from "lucide-react"

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
    <div className="flex items-center justify-between mb-2">
      <h2 className="text-xs font-semibold text-ink">{title}</h2>
      {action ? (
        <Link
          href={action.href}
          className="text-[10px] text-ink-soft/75 hover:text-ink-soft flex items-center gap-0.5"
        >
          {action.label} <ArrowRight className="h-2.5 w-2.5" />
        </Link>
      ) : count !== undefined ? (
        <span className="bg-surface text-ink-soft text-[9px] px-1.5 py-0.5 rounded-full font-medium">
          {count}
        </span>
      ) : null}
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
          <p className="text-[11px] font-medium text-ink">{label}</p>
          <p className="text-[10px] text-ink-soft/75">{value}</p>
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
}: {
  icon: ReactNode
  title: string
  subtitle: string
  rightTop?: string
  rightBottom?: string
  href?: string
}) {
  const body = (
    <div className="bg-white border border-line shadow-sm rounded-xl p-2.5 flex items-center gap-2.5">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-ink truncate">{title}</p>
        <div className="flex items-center gap-1 text-[10px] text-ink-soft/75">
          <MapPin className="h-2.5 w-2.5 shrink-0" />
          <span className="truncate">{subtitle}</span>
        </div>
      </div>
      {(rightTop || rightBottom) && (
        <div className="text-right shrink-0">
          {rightTop && <p className="text-[11px] font-bold text-ink">{rightTop}</p>}
          {rightBottom && <p className="text-[9px] text-ink-soft/75">{rightBottom}</p>}
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

// ── Timeline Item (legacy — prefer dense list layout for long lists) ──
export function TimelineItem({
  time,
  timeEnd,
  title,
  location,
  isActive,
  isLast,
}: {
  time: string
  timeEnd?: string
  title: string
  location: string
  isActive?: boolean
  isLast?: boolean
}) {
  return (
    <div className="relative flex gap-2.5">
      <div className="relative z-10 flex flex-col items-center">
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-full ${
            isActive ? "bg-forest text-white" : "bg-white border border-line"
          }`}
        >
          {isActive ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            <div className="h-1.5 w-1.5 rounded-full bg-line" />
          )}
        </div>
      </div>
      <div className={`flex-1 ${isLast ? "" : "pb-2"}`}>
        <div
          className={`rounded-xl p-2.5 ${
            isActive ? "bg-deep text-white" : "bg-white border border-line shadow-sm"
          }`}
        >
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-[11px] font-bold ${isActive ? "text-acid" : "text-ink"}`}>
              {time}
            </span>
            {timeEnd && (
              <span className={`text-[9px] ${isActive ? "text-white/55" : "text-ink-soft/75"}`}>
                — {timeEnd}
              </span>
            )}
          </div>
          <p
            className={`text-[11px] font-semibold leading-tight truncate ${
              isActive ? "text-white" : "text-ink"
            }`}
          >
            {title}
          </p>
          <div
            className={`flex items-center gap-1 text-[10px] mt-0.5 ${
              isActive ? "text-acid" : "text-ink-soft/75"
            }`}
          >
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{location}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Timeline({ children }: { children: ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute left-[10px] top-2 bottom-2 w-px bg-surface" />
      <div>{children}</div>
    </div>
  )
}

// ── Empty State ──
export function EmptyState({ icon, message }: { icon: ReactNode; message: string }) {
  return (
    <div className="bg-white border border-line shadow-sm rounded-2xl py-6 text-center">
      <div className="flex justify-center mb-1 text-ink-soft/40">{icon}</div>
      <p className="text-[11px] text-ink-soft/75">{message}</p>
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
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-white/70">
          <Clock className="h-3 w-3" />
          {eyebrow}
        </div>
        {meta && <span className="text-[10px] font-medium text-acid">{meta}</span>}
      </div>
      <h3 className="text-sm font-bold leading-tight mb-1.5">{title}</h3>
      <div className="flex items-center gap-1 text-[11px] text-acid">
        <MapPin className="h-3 w-3 shrink-0" />
        <span className="truncate">{location}</span>
      </div>
      {description && (
        <p className="text-[10px] text-white/65 leading-relaxed mt-2 pt-2 border-t border-white/10">
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
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-white/55">
          {eyebrow}
        </div>
        <span className="text-[10px] text-white/55">{doneLabel}</span>
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
