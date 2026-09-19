// Kirim FCM token dari Android bridge / browser ke server
"use client"

import { useEffect } from "react"

type ShellWithFcm = {
  getFcmToken?: () => string | null
  onFcmToken?: (cb: (token: string) => void) => void
}

export function getShell(): ShellWithFcm | null {
  if (typeof window === "undefined") return null
  return ((window as unknown as { SevenBroShell?: ShellWithFcm }).SevenBroShell ?? null)
}

export async function registerFcmToken(token: string, platform = "android"): Promise<void> {
  if (!token) return
  try {
    await fetch("/api/push/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fcm_token: token, platform }),
    })
  } catch {
    /* silent */
  }
}

/** Hook: daftarkan token FCM dari shell Android (retry karena token bisa datang belakangan) */
export function useFcmTokenRegister(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    const shell = getShell()
    if (!shell) return
    const tryRegister = (t?: string | null) => {
      const token = t || shell.getFcmToken?.()
      if (token) void registerFcmToken(token)
    }
    tryRegister()
    shell.onFcmToken?.((t) => tryRegister(t))
    // Token sering baru siap beberapa detik setelah login
    const timers = [800, 2000, 5000, 10000].map((ms) =>
      window.setTimeout(() => tryRegister(), ms),
    )
    return () => {
      timers.forEach((id) => clearTimeout(id))
    }
  }, [enabled])
}
