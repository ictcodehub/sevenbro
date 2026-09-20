"use client"

import { useRef } from "react"
import { Copy, Pencil, Trash2 } from "lucide-react"

/**
 * Tap content → onOpen. Swipe/drag left → Edit / [Duplicate] / Delete.
 * Swipe right or tap after swipe → close.
 * Pointer events: jalan di touch + mouse (desktop).
 */
export function SwipeRow({
  children,
  onOpen,
  onEdit,
  onDelete,
  onDuplicate,
  open,
  setOpen,
}: {
  children: React.ReactNode
  onOpen?: () => void
  onEdit: () => void
  onDelete: () => void
  onDuplicate?: () => void
  open: boolean
  setOpen: (v: boolean) => void
}) {
  const startX = useRef(0)
  const dragging = useRef(false)
  const moved = useRef(false)
  const width = onDuplicate ? 144 : 96

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX
    dragging.current = true
    moved.current = false
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging.current) return
    dragging.current = false
    const dx = e.clientX - startX.current
    if (Math.abs(dx) > 8) moved.current = true
    if (dx < -40) setOpen(true)
    else if (dx > 40) setOpen(false)
  }

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <div className="absolute inset-y-0 right-0 flex">
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            onEdit()
          }}
          className="flex w-12 flex-col items-center justify-center gap-0.5 bg-surface text-ink-soft"
          aria-label="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">Edit</span>
        </button>
        {onDuplicate && (
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              onDuplicate()
            }}
            className="flex w-12 flex-col items-center justify-center gap-0.5 bg-page text-ink-soft"
            aria-label="Duplicate"
          >
            <Copy className="h-3.5 w-3.5" />
            <span className="text-xs font-semibold">Copy</span>
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            onDelete()
          }}
          className="flex w-12 flex-col items-center justify-center gap-0.5 bg-alert text-white"
          aria-label="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="text-xs font-semibold">Hapus</span>
        </button>
      </div>

      <div
        className="relative transition-transform duration-150 touch-pan-y"
        style={{ transform: open ? `translateX(-${width}px)` : "translateX(0)" }}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={() => {
          if (open) {
            setOpen(false)
            return
          }
          if (moved.current) {
            moved.current = false
            return
          }
          onOpen?.()
        }}
      >
        {children}
      </div>
    </div>
  )
}
