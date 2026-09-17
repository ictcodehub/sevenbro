// ============================================================
// Cache data API di perangkat (SWR localStorage).
// Buka halaman kedua: tampilkan cache dulu, lalu revalidate.
// ============================================================

export const SWR_CACHE_KEY = "sevenbro:swr-cache"

function readCache(): [string, unknown][] {
  try {
    const raw = localStorage.getItem(SWR_CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed as [string, unknown][]
  } catch {
    return []
  }
}

function writeCache(entries: Iterable<[string, unknown]>): void {
  try {
    localStorage.setItem(SWR_CACHE_KEY, JSON.stringify([...entries]))
  } catch {
    /* quota / private mode */
  }
}

/**
 * SWR provider: Map yang di-persist ke localStorage.
 * Dipakai via SWRConfig di root client.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function swrLocalStorageProvider(): Map<string, any> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = new Map<string, any>(readCache())
  let timer: ReturnType<typeof setTimeout> | null = null
  const scheduleSave = () => {
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      writeCache(map)
    }, 200)
  }

  const origSet = map.set.bind(map)
  map.set = (key: string, value: unknown) => {
    origSet(key, value)
    scheduleSave()
    return map
  }
  const origDelete = map.delete.bind(map)
  map.delete = (key: string) => {
    const ok = origDelete(key)
    scheduleSave()
    return ok
  }
  const origClear = map.clear.bind(map)
  map.clear = () => {
    origClear()
    scheduleSave()
  }

  if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", () => writeCache(map))
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") writeCache(map)
    })
  }

  return map
}

/** Bersihkan cache data saat logout / ganti akun. */
export function clearSwrCache(): void {
  try {
    localStorage.removeItem(SWR_CACHE_KEY)
  } catch {
    /* ignore */
  }
  if (typeof caches !== "undefined") {
    void caches.delete("api-data").catch(() => {})
  }
}
