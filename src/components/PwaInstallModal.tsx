"use client"

import { useCallback, useEffect, useState } from "react"
import { Download, X } from "lucide-react"

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
 * Smart Install Prompt — bottom sheet ala design system Seven Bro
 * (deep header + white body + forest CTA). Android prompt / iOS instruksi.
 * Tidak muncul bila PWA sudah terpasang.
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
        /* lanjut ke instruksi */
      }
    }
    close(true)
  }

  if (!open || isStandalone()) return null
  const ios = isIos()

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-install-title"
      style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        aria-label="Tutup"
        onClick={() => close(true)}
        className="absolute inset-0 bg-ink/45"
      />

      <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-white shadow-lg">
        {/* Header deep — sama seperti kartu saldo / arena */}
        <div className="bg-deep px-4 pt-4 pb-3.5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-11 w-11 shrink-0 rounded-xl overflow-hidden bg-white/10 ring-1 ring-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/icon-192.png"
                  alt=""
                  width={44}
                  height={44}
                  className="h-full w-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-medium text-white/55">Install App</p>
                <h2
                  id="pwa-install-title"
                  className="text-[15px] font-bold text-acid leading-tight mt-0.5"
                >
                  Pasang Seven Bro
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => close(true)}
              aria-label="Tutup"
              className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg bg-white/10 text-white/70 active:opacity-70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2.5 text-[12px] text-white/70 leading-snug">
            Buka dari layar utama seperti app biasa. Ikon bebek, cepat, dan offline-friendly.
          </p>
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-3">
          {!promptEvt ? (
            <div className="rounded-xl bg-page border border-line px-3 py-2.5">
              <p className="text-[10px] font-semibold text-forest mb-1.5">
                {ios ? "Di iPhone (Safari)" : "Di Android (Chrome)"}
              </p>
              <ol className="text-[11px] text-ink-soft/80 space-y-1.5 list-decimal pl-4 leading-snug">
                {ios ? (
                  <>
                    <li>
                      Ketuk <span className="font-semibold text-ink">Bagikan</span>
                    </li>
                    <li>
                      Pilih{" "}
                      <span className="font-semibold text-ink">Tambahkan ke Layar Utama</span>
                    </li>
                    <li>
                      Tekan <span className="font-semibold text-ink">Tambah</span>
                    </li>
                  </>
                ) : (
                  <>
                    <li>
                      Buka menu <span className="font-semibold text-ink">⋮</span>
                    </li>
                    <li>
                      Pilih{" "}
                      <span className="font-semibold text-ink">Instal aplikasi</span>
                    </li>
                    <li>
                      Konfirmasi <span className="font-semibold text-ink">Instal</span>
                    </li>
                  </>
                )}
              </ol>
            </div>
          ) : (
            <p className="text-[11px] text-ink-soft/70 leading-snug">
              Browser kamu siap memasang. Tekan tombol di bawah, lalu konfirmasi di dialog
              Chrome.
            </p>
          )}
        </div>

        {/* Actions — full width, min 44px tap target */}
        <div className="px-4 pb-4 space-y-2">
          <button
            type="button"
            onClick={() => void doInstall()}
            className="w-full min-h-[44px] flex items-center justify-center gap-1.5 rounded-xl bg-forest text-white text-[13px] font-bold py-3 active:scale-[0.98] transition-transform"
          >
            <Download className="h-4 w-4" />
            {ios ? "Cara Pasang" : promptEvt ? "Instal Sekarang" : "Mengerti, Buka Menu"}
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className="w-full min-h-[44px] rounded-xl bg-page border border-line text-[12px] font-semibold text-ink-soft py-2.5 active:scale-[0.98] transition-transform"
          >
            Nanti Saja
          </button>
        </div>
      </div>
    </div>
  )
}
