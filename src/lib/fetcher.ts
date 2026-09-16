"use client"

// ============================================================
// Fetcher & SWR wrapper untuk KelasKita 7B
// FASE 4: route handler + UI pakai useAppSWR + fetcher
// ============================================================

import useSWR from "swr"

export async function fetcher<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: { Accept: "application/json" } })
  const body = await r.json().catch(() => null)
  if (!r.ok) {
    throw new Error((body as { error?: string })?.error ?? `Gagal memuat (${r.status})`)
  }
  return body as T
}

/**
 * Hook data standar untuk semua slice FASE 4.
 * `path` URL relatif (mis. "/api/announcements").
 * `policy` opsional — cadangan untuk gating UI per-role di slice berikutnya;
 * otorisasi sesungguhnya tetap di server via requireApi(policyFn).
 */
export function useAppSWR<T>(
  path: string | null,
  _policy?: string,
  opts?: { refreshInterval?: number },
): {
  data: T | null
  error: boolean
  mutate: () => void
} {
  const { data, error, mutate } = useSWR<T>(path, fetcher, {
    refreshInterval: opts?.refreshInterval ?? 0,
    revalidateOnFocus: true,
  })
  return {
    data: data ?? null,
    error: Boolean(error),
    mutate: () => {
      void mutate()
    },
  }
}