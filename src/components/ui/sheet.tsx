"use client"

import { type ReactNode, useEffect } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Tinggi/posisi aman untuk shell Android + browser PWA:
 * - Shell: root native sudah pad system bar → --sevenbro-safe-bottom: 0
 * - Browser: env(safe-area-inset-bottom) via --sevenbro-safe-bottom
 * fullHeight & bottom-sheet sama-sama absolute (bukan h-full / flex stretch)
 * supaya tidak pernah resolve ke auto / meninggalkan gap ke nav.
 */
const FULL_HEIGHT =
  "calc(100dvh - var(--sevenbro-nav-bar-inset, 0px) - var(--sevenbro-safe-bottom, env(safe-area-inset-bottom, 0px)))"

const CONTENT_PB =
  "calc(1rem + var(--sevenbro-nav-bar-inset, 0px) + var(--sevenbro-safe-bottom, env(safe-area-inset-bottom, 0px)))"

export function Sheet({
  open,
  onClose,
  title,
  children,
  fullHeight = false,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Modal full viewport — menutup bottom nav app */
  fullHeight?: boolean
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        aria-label="Tutup"
        className="absolute inset-0 bg-deep/40"
        onClick={onClose}
      />
      {/* Panel: fullHeight = isi viewport · bottom sheet = nempel di bawah */}
      <div
        className={cn(
          "absolute inset-x-0 flex justify-center px-0",
          fullHeight ? "inset-y-0" : "bottom-0",
        )}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={cn(
            "relative w-full max-w-lg min-w-0 flex flex-col bg-white shadow-lg overflow-hidden",
            fullHeight
              ? "h-full rounded-none border-0 sm:rounded-2xl sm:border sm:border-line"
              : "max-h-[85dvh] rounded-t-2xl sm:rounded-2xl border-t border-line sm:border sm:border-line",
          )}
          style={
            fullHeight
              ? { height: FULL_HEIGHT, maxHeight: FULL_HEIGHT }
              : {
                  // pastikan tepi bawah sheet = bawah viewport (tidak floating)
                  marginBottom: 0,
                }
          }
        >
          <div className="flex items-center justify-between gap-2 px-4 pt-4 pb-3 border-b border-line shrink-0">
            <h2 className="text-sm font-medium text-ink min-w-0 truncate">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-surface"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div
            className="flex-1 min-h-0 scroll-y-only px-4 py-4"
            style={{ paddingBottom: CONTENT_PB }}
          >
            <div className="space-y-3 min-w-0">{children}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold text-ink">{label}</span>
      {children}
      {hint && <span className="block text-[9px] text-ink-soft/70">{hint}</span>}
    </label>
  )
}

export const inputClass =
  "w-full rounded-xl border border-line bg-page px-3 py-2 text-[12px] text-ink placeholder:text-ink-soft/50 focus:outline-none focus:ring-2 focus:ring-forest/30"
