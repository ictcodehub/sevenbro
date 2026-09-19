export const READ_KEY = "sevenbro:read-notifications"
export const DELETED_KEY = "sevenbro:deleted-notifications"
export const NOTIF_EVENT = "sevenbro:notifications-changed"

export function loadIdSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    return new Set(JSON.parse(localStorage.getItem(key) || "[]") as string[])
  } catch {
    return new Set()
  }
}

export function saveIdSet(key: string, ids: string[] | Set<string>): void {
  try {
    const list = ids instanceof Set ? [...ids] : ids
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    /* private mode */
  }
}

/** Setelah mutate localStorage, broadcast supaya AppShell/layout refresh badge */
export function notifyNotificationsChanged(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(NOTIF_EVENT))
}

/**
 * Migrasi sekali: id yang dulu hanya dihapus di localStorage
 * di-push ke server (soft-delete) supaya install ulang tidak memunculkan lagi.
 */
export async function migrateLocalDeletedToServer(): Promise<void> {
  if (typeof window === "undefined") return
  const local = loadIdSet(DELETED_KEY)
  if (!local.size) return
  await Promise.all(
    [...local].map((id) =>
      fetch(`/api/notifications/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(
        () => {},
      ),
    ),
  )
  saveIdSet(DELETED_KEY, new Set())
}
