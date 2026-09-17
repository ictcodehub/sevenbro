export type Prefs = {
  push: boolean
  dark: boolean
  offline: boolean
}

export const PREFS_KEY = "sevenbro:settings-prefs"

export const DEFAULT_PREFS: Prefs = {
  push: false,
  dark: false,
  offline: true,
}

export function loadPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return DEFAULT_PREFS
    return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<Prefs>) }
  } catch {
    return DEFAULT_PREFS
  }
}

export function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* private mode */
  }
}

/** Toggle class `dark` di <html> — token CSS ikut flip */
export function applyDarkMode(enabled: boolean): void {
  if (typeof document === "undefined") return
  document.documentElement.classList.toggle("dark", enabled)
}

export function pushSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window
}

export function pushPermission(): NotificationPermission | "unsupported" {
  if (!pushSupported()) return "unsupported"
  return Notification.permission
}

/** Minta izin browser; return true hanya kalau granted */
export async function requestPushPermission(): Promise<boolean> {
  if (!pushSupported()) return false
  if (Notification.permission === "granted") return true
  if (Notification.permission === "denied") return false
  const result = await Notification.requestPermission()
  return result === "granted"
}

/** Notifikasi lokal (bukan web-push server) — cukup untuk on-device */
export function showBrowserNotification(title: string, body: string): void {
  if (!pushSupported() || Notification.permission !== "granted") return
  try {
    new Notification(title, {
      body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
    })
  } catch {
    /* some browsers require SW — silent fail */
  }
}

/**
 * Terapkan patch preferensi.
 * - dark → langsung toggle class
 * - push ON → minta izin; kalau ditolak, return null (jangan simpan)
 */
export async function applyPrefsPatch(
  current: Prefs,
  patch: Partial<Prefs>
): Promise<Prefs | null> {
  const next: Prefs = { ...current, ...patch }

  if (patch.push === true) {
    const granted = await requestPushPermission()
    if (!granted) return null
  }

  if (patch.dark !== undefined) {
    applyDarkMode(next.dark)
  }

  savePrefs(next)
  return next
}
