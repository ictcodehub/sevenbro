"use client"

import { useCallback, useEffect, useState } from "react"
import type { CSSProperties } from "react"

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

const DISMISS_KEY = "sevenbro:install-modal-dismissed"
const SHOWN_KEY = "sevenbro:install-modal-shown"

function isStandalone(): boolean {
  if (typeof window === "undefined") return false
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: window-controls-overlay)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  if (typeof window === "undefined") return false
  return /iPhone|iPad|iPod/i.test(navigator.userAgent)
}

/**
 * Smart Install Prompt — alert modal gaya iOS system alert / notification.
 * Android: beforeinstallprompt bila ada · iOS: instruksi Bagikan.
 * Sudah install → tidak muncul.
 */
export default function PwaInstallModal() {
  const [open, setOpen] = useState(false)
  const [promptEvt, setPromptEvt] = useState<BeforeInstallPromptEvent | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (isStandalone()) return

    let dismissed = false
    try {
      if (sessionStorage.getItem(DISMISS_KEY) === "1") dismissed = true
      const ls = localStorage.getItem(DISMISS_KEY)
      if (ls && Date.now() - Number(ls) < 1000 * 60 * 60 * 24 * 7) dismissed = true
    } catch {}
    if (dismissed) return

    const onPrompt = (e: Event) => {
      e.preventDefault()
      setPromptEvt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setOpen(false)
      setPromptEvt(null)
      try {
        localStorage.removeItem(DISMISS_KEY)
      } catch {}
    }

    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)

    const t = window.setTimeout(() => {
      if (isStandalone()) return
      setOpen(true)
      try {
        localStorage.setItem(SHOWN_KEY, "1")
      } catch {}
    }, 2000)

    setReady(true)
    return () => {
      window.clearTimeout(t)
      window.removeEventListener("beforeinstallprompt", onPrompt)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const close = useCallback((remember: boolean) => {
    setOpen(false)
    if (remember) {
      try {
        sessionStorage.setItem(DISMISS_KEY, "1")
        localStorage.setItem(DISMISS_KEY, String(Date.now()))
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (ready && isStandalone()) setOpen(false)
  }, [ready])

  const doInstall = async () => {
    if (promptEvt) {
      try {
        await promptEvt.prompt()
        const choice = await promptEvt.userChoice
        if (choice.outcome === "accepted") {
          close(false)
          try {
            localStorage.setItem("sevenbro:installed", "1")
          } catch {}
          return
        }
      } catch {
        /* biarkan modal instruksi tetap / tutup */
      }
    }
    close(true)
  }

  if (!open || isStandalone()) return null
  const ios = isIos()

  const bodyStyle: CSSProperties = {
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        aria-label="Tutup"
        onClick={() => close(true)}
        className="absolute inset-0 bg-black/45"
      />

      {/* iOS-style alert card */}
      <div
        className="relative w-full max-w-[286px] overflow-hidden rounded-[22px] shadow-[0_20px_50px_rgba(0,0,0,0.35)] border border-white/40"
        style={bodyStyle}
      >
        <div className="bg-white/95 dark:bg-[#2c2c2e]/98">
          {/* Header — icon + title, center (ala iOS alert) */}
          <div className="px-5 pt-5 pb-3 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-[14px] overflow-hidden bg-page ring-1 ring-black/5 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icon-192.png"
                alt=""
                width={56}
                height={56}
                className="h-full w-full object-contain"
              />
            </div>
            <h2
              id="pwa-install-title"
              className="text-[16px] font-semibold text-ink leading-tight tracking-tight"
            >
              Pasang Seven Bro di layar utama?
            </h2>
            <p className="mt-1.5 text-[13px] text-ink-soft/75 leading-snug text-balance">
              Buka lebih cepat seperti app biasa. Ringan, offline-friendly, ikon bebek
              langsung di home.
            </p>

            {!promptEvt && (
              <p className="mt-3 text-left text-[12px] text-ink-soft/70 leading-relaxed">
                {ios ? (
                  <>
                    <span className="font-medium text-ink">1.</span> Ketuk{" "}
                    <span className="font-semibold text-ink">Bagikan</span> di Safari ·{" "}
                    <span className="font-medium text-ink">2.</span>{" "}
                    <span className="font-semibold text-ink">Tambahkan ke Layar Utama</span> ·{" "}
                    <span className="font-medium text-ink">3.</span>{" "}
                    <span className="font-semibold text-ink">Tambah</span>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-ink">1.</span> Menu{" "}
                    <span className="font-semibold text-ink">⋮</span> ·{" "}
                    <span className="font-medium text-ink">2.</span>{" "}
                    <span className="font-semibold text-ink">Instal aplikasi</span> ·{" "}
                    <span className="font-medium text-ink">3.</span>{" "}
                    <span className="font-semibold text-ink">Instal</span>
                  </>
                )}
              </p>
            )}
          </div>

          {/* iOS alert actions — full-width, hairline dividers */}
          <div className="border-t border-black/[0.08]">
            <button
              type="button"
              onClick={() => void doInstall()}
              className="w-full min-h-[44px] px-4 py-3.5 text-[15px] font-semibold text-[#0a84ff] active:bg-black/[0.04] transition-colors"
            >
              {ios ? "Cara Pasang" : "Instal Sekarang"}
            </button>
            <button
              type="button"
              onClick={() => close(true)}
              className="w-full min-h-[44px] px-4 py-3.5 text-[15px] font-normal text-[#0a84ff] border-t border-black/[0.08] active:bg-black/[0.04] transition-colors"
            >
              Nanti Saja
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
