"use client"

import { useEffect, useState } from "react"
import { RotateCcw } from "lucide-react"
import { NOTIFICATIONS, type AppNotification } from "@/lib/demo-data"
import {
  DELETED_KEY,
  NOTIF_EVENT,
  READ_KEY,
  loadIdSet,
  notifyNotificationsChanged,
  saveIdSet,
} from "@/lib/notifications-store"

export default function NotificationHistoryPage() {
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  useEffect(() => {
    setReadIds(loadIdSet(READ_KEY))
    setDeletedIds(loadIdSet(DELETED_KEY))
    setReady(true)
  }, [])

  const items: (AppNotification & { deleted: boolean })[] = NOTIFICATIONS.map((n) => ({
    ...n,
    read: n.read || readIds.has(n.id),
    deleted: deletedIds.has(n.id),
  }))

  const markAllRead = () => {
    const next = new Set(NOTIFICATIONS.map((n) => n.id))
    setReadIds(next)
    saveIdSet(READ_KEY, next)
    notifyNotificationsChanged()
  }

  const restore = (id: string) => {
    setDeletedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      saveIdSet(DELETED_KEY, next)
      notifyNotificationsChanged()
      return next
    })
  }

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-ink">Riwayat Notifikasi</h1>
          <p className="text-[11px] text-ink-soft/75">
            Termasuk notifikasi yang dihapus dari shade
          </p>
        </div>
        {ready && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-[11px] font-medium text-forest shrink-0 mt-1 active:opacity-70"
          >
            Tandai Dibaca
          </button>
        )}
      </div>

      {!ready ? null : items.length === 0 ? (
        <div className="bg-white border border-line shadow-sm rounded-2xl p-6 text-center">
          <p className="text-[12px] text-ink-soft/70">Belum ada riwayat notifikasi.</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((n) => (
            <li
              key={n.id}
              className={`px-3.5 py-3 rounded-xl bg-white border border-line shadow-sm ${
                n.deleted ? "opacity-65" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className={`text-[11px] leading-snug truncate ${
                    n.read ? "font-medium text-ink/80" : "font-semibold text-ink"
                  }`}
                >
                  {n.title}
                </p>
                <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                  <span className="text-[10px] text-ink-soft/50">{n.time}</span>
                  {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-forest" />}
                </div>
              </div>
              <p className="text-[10px] text-ink-soft/70 mt-1 leading-snug">{n.body}</p>
              {n.deleted && (
                <button
                  type="button"
                  onClick={() => restore(n.id)}
                  className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-forest active:opacity-70"
                >
                  <RotateCcw className="h-3 w-3" />
                  Pulihkan ke Notifikasi
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="h-2" />
    </div>
  )
}
