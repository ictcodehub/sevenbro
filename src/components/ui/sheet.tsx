"use client"

import { type ReactNode, useEffect } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Tinggi full viewport, aman untuk shell Android + browser PWA:
 * - Shell sudah pad root untuk system bar → set --sevenbro-safe-bottom: 0
 * - Browser: kurangi env(safe-area-inset-bottom) (viewport-fit=cover)
 * JANGAN pakai h-full/% — parent fixed bisa bikin height resolve ke auto
 * sehingga sheet hanya setinggi konten dan bottom nav bocor di bawah.
 */
const FULL_HEIGHT =
  "calc(100dvh - var(--sevenbro-nav-bar-inset, 0px) - var(--sevenbro-safe-bottom, env(safe-area-inset-bottom, 0px)))"

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
    <div
      className={cn(
        // z di atas bottom nav (z-40) + notif shade (z-50)
        "fixed inset-0 z-[60] flex justify-center",
        fullHeight ? "" : "items-end sm:items-center",
      )}
    >
      <button
        type="button"
        aria-label="Tutup"
        className="absolute inset-0 bg-deep/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative w-full max-w-lg min-w-0 flex flex-col bg-white shadow-lg overflow-hidden",
          fullHeight
            ? "rounded-none border-0 sm:rounded-2xl sm:border sm:border-line"
            : "max-h-[min(85dvh,calc(85dvh-env(safe-area-inset-bottom,0px)))] rounded-t-2xl sm:rounded-2xl border border-line",
        )}
        style={
          fullHeight
            ? {
                height: FULL_HEIGHT,
                maxHeight: FULL_HEIGHT,
                // pastikan menutup nav bawah walau flex stretch gagal
                alignSelf: "stretch",
              }
            : undefined
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
          style={{
            paddingBottom:
              "calc(1rem + var(--sevenbro-nav-bar-inset, 0px) + var(--sevenbro-safe-bottom, env(safe-area-inset-bottom, 0px)))",
          }}
        >
          <div className="space-y-3 min-w-0">{children}</div>
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
