"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { RotateCcw } from "lucide-react"
import {
  DELETED_KEY,
  NOTIF_EVENT,
  READ_KEY,
  loadIdSet,
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
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ""
  const diff = Math.max(0, Date.now() - t)
  const m = Math.floor(diff / 60000)
  if (m < 1) return "Baru saja"
  if (m < 60) return `${m} menit lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} hari lalu`
  return new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
}

export default function NotificationHistoryPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const [items, setItems] = useState<ApiNotif[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set())
  const [ready, setReady] = useState(false)

  const load = async () => {
    try {
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
    setDeletedIds(loadIdSet(DELETED_KEY))
    void load()
  }, [])

  const markAllRead = () => {
    const next = new Set(items.map((n) => n.id))
    setReadIds(next)
    saveIdSet(READ_KEY, next)
    notifyNotificationsChanged()
  }

  const deleteAll = () => {
    const next = new Set(items.map((n) => n.id))
    setDeletedIds(next)
    saveIdSet(DELETED_KEY, next)
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

  const openNotif = (n: ApiNotif) => {
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

  return (
    <div className="px-4 py-3 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-ink">Riwayat Notifikasi</h1>
          <p className="text-[11px] text-ink-soft/75">
            Termasuk notifikasi yang dihapus dari shade
          </p>
        </div>
        {ready && items.length > 0 && (
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
            const deleted = deletedIds.has(n.id)
            const read = readIds.has(n.id)
            return (
              <li
                key={n.id}
                onClick={() => openNotif(n)}
                className={`px-3.5 py-3 rounded-xl bg-white border border-line shadow-sm cursor-pointer active:scale-[0.99] transition-transform ${
                  deleted ? "opacity-65" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p
                    className={`text-[11px] leading-snug truncate ${
                      read ? "font-medium text-ink/80" : "font-semibold text-ink"
                    }`}
                  >
                    {n.title}
                  </p>
                  <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                    <span className="text-[10px] text-ink-soft/50">{timeAgo(n.created_at)}</span>
                    {!read && <span className="h-1.5 w-1.5 rounded-full bg-forest" />}
                  </div>
                </div>
                <p className="text-[10px] text-ink-soft/70 mt-1 leading-snug">{n.body}</p>
                {deleted && (
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
            )
          })}
        </ul>
      )}

      <div className="h-2" />
    </div>
  )
}
