"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { RotateCcw, X } from "lucide-react"
import {
  READ_KEY,
  loadIdSet,
  migrateLocalDeletedToServer,
  notifyNotificationsChanged,
  saveIdSet,
} from "@/lib/notifications-store"
import { pathForNotification } from "@/lib/notif-nav"

type ApiNotif = {
  id: string
  title: string
  body: string
  kind: string | null
  actor: string | null
  created_at: string
  deleted_at?: string | null
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ""
  const diff = Math.max(0, Date.now() - t)
  const m = Math.floor(diff / 60000)
  if (m < 1) return "Baru saja"
  if (m < 60) return `${m} menit lalu`
  // ≥ 60 menit → jam posting (mis. 23:00)
  return new Date(t).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

export default function NotificationHistoryPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const [items, setItems] = useState<ApiNotif[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  const load = async () => {
    try {
      await migrateLocalDeletedToServer()
      const r = await fetch("/api/notifications", { headers: { Accept: "application/json" } })
      const rows = r.ok ? ((await r.json()) as ApiNotif[]) : []
      setItems(Array.isArray(rows) ? rows : [])
    } catch {
      setItems([])
    } finally {
      setReady(true)
    }
  }

  useEffect(() => {
    setReadIds(loadIdSet(READ_KEY))
    void load()
  }, [])

  const markAllRead = () => {
    const next = new Set(items.map((n) => n.id))
    setReadIds(next)
    saveIdSet(READ_KEY, next)
    notifyNotificationsChanged()
  }

  const deleteAll = () => {
    setItems([])
    void fetch("/api/notifications/clear", { method: "DELETE" }).catch(() => {})
    notifyNotificationsChanged()
  }

  /** Hard-delete 1 baris — hapus dari DB, bukan soft-delete */
  const removeOne = (id: string) => {
    setItems((prev) => prev.filter((n) => n.id !== id))
    void fetch(`/api/notifications/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }).catch(() => {})
    notifyNotificationsChanged()
  }

  const restore = (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, deleted_at: null } : n)))
    void fetch(`/api/notifications/${encodeURIComponent(id)}`, { method: "PATCH" }).catch(() => {})
    notifyNotificationsChanged()
  }

  const openNotif = (n: ApiNotif) => {
    if (n.deleted_at) return
    const next = new Set(readIds)
    next.add(n.id)
    setReadIds(next)
    saveIdSet(READ_KEY, next)
    notifyNotificationsChanged()
    if (role === "TEACHER") {
      router.replace("/app/scan")
      return
    }
    router.push(pathForNotification(n.kind, n.title, n.body))
  }

  const activeCount = items.filter((n) => !n.deleted_at).length

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-ink">Riwayat Notifikasi</h1>
          <p className="text-[11px] text-ink-soft/75">
            Termasuk notifikasi yang dihapus dari shade
          </p>
        </div>
        {ready && activeCount > 0 && (
          <div className="flex flex-col items-end gap-1.5 shrink-0 mt-1">
            <button
              type="button"
              onClick={markAllRead}
              className="text-[11px] font-medium text-forest active:opacity-70"
            >
              Tandai Dibaca
            </button>
            <button
              type="button"
              onClick={deleteAll}
              className="text-[11px] font-semibold text-alert active:opacity-70"
            >
              Hapus Semua
            </button>
          </div>
        )}
      </div>

      {!ready ? null : items.length === 0 ? (
        <div className="bg-white border border-line shadow-sm rounded-2xl p-6 text-center">
          <p className="text-[12px] text-ink-soft/70">Belum ada riwayat notifikasi.</p>
        </div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((n) => {
            const deleted = Boolean(n.deleted_at)
            const read = readIds.has(n.id)
            return (
              <li
                key={n.id}
                className={`flex items-stretch rounded-xl bg-white border border-line ${
                  deleted ? "opacity-65" : ""
                }`}
              >
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => openNotif(n)}
                    className="w-full text-left px-2.5 pt-2.5 pb-1 active:opacity-80"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {!read && !deleted && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-forest" />
                      )}
                      <span
                        className={`min-w-0 flex-1 truncate text-[11px] ${
                          read ? "font-medium text-ink/80" : "font-semibold text-ink"
                        }`}
                      >
                        {n.title}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-ink-soft/75">{n.body}</p>
                    <p className="mt-0.5 text-[11px] text-ink-soft/55">
                      {timeAgo(n.created_at)}
                    </p>
                  </button>
                </div>
                {deleted ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      restore(n.id)
                    }}
                    aria-label="Pulihkan"
                    className="flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-lg text-forest active:bg-surface mr-1"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeOne(n.id)
                    }}
                    aria-label="Hapus notifikasi"
                    className="flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-lg text-ink-soft/70 active:bg-alert-bg active:text-alert mr-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <div className="h-2" />
    </div>
  )
}
