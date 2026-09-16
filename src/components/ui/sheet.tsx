"use client"

import { type ReactNode, useEffect } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
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
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
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
          "relative w-full max-w-lg bg-white border border-line rounded-t-2xl sm:rounded-2xl",
          "max-h-[85dvh] overflow-y-auto p-4 space-y-3 shadow-lg",
          "animate-in",
        )}
      >
        <div className="flex items-center justify-between -mt-1">
          <h2 className="text-sm font-bold text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft hover:bg-surface"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
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
