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
    // iOS Safari
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos(): boolean {
  if (typeof window === "undefined") return false
  const ua = navigator.userAgent
  return /iPhone|iPad|iPod/i.test(ua)
}

/**
 * Smart Install Prompt — modal nawarin install PWA bila belum terpasang.
 * - Android/Chrome: pakai beforeinstallprompt bila ada
 * - iOS: instruksi Bagikan → Tambahkan ke Layar Utama
 * - Sudah install (standalone) → tidak muncul sama sekali
 */
export default function PwaInstallModal() {
  const [open, setOpen] = useState(false)
  const [promptEvt, setPromptEvt] = useState<BeforeInstallPromptEvent | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (isStandalone()) return

    let dismissed = false
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === "1"
      // Kalau user sudah pernah lihat di sesi ini & sudah dismiss, tunggu sesi baru
      if (sessionStorage.getItem(DISMISS_KEY) === "1") dismissed = true
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
        localStorage.setItem("sevenbro:installed", "1")
        localStorage.removeItem(DISMISS_KEY)
      } catch {}
    }

    window.addEventListener("beforeinstallprompt", onPrompt)
    window.addEventListener("appinstalled", onInstalled)

    // Delay biar tidak bentrok pas login / load pertama
    const t = window.setTimeout(() => {
      if (isStandalone()) return
      setOpen(true)
      try {
        localStorage.setItem(SHOWN_KEY, "1")
      } catch {}
    }, 2200)

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
        // Jangan permanen — minggu depan bisa nawarin lagi
        localStorage.setItem(DISMISS_KEY, String(Date.now()))
      } catch {}
    }
  }, [])

  // Kalau sudah install, tutup
  useEffect(() => {
    if (!ready) return
    if (isStandalone()) setOpen(false)
  }, [ready])

  const doInstall = async () => {
    if (promptEvt) {
      try {
        await promptEvt.prompt()
        const choice = await promptEvt.userChoice
        if (choice.outcome === "accepted") {
          close(false)
          setIsInstalledLocal()
          return
        }
      } catch {
        /* fallback ke instruksi */
      }
    }
    setReady(true)
  }

  const setIsInstalledLocal = () => {
    try {
      localStorage.setItem("sevenbro:installed", "1")
    } catch {}
  }

  if (!open || isStandalone()) return null

  const ios = isIos()

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Install aplikasi"
    >
      <button
        type="button"
        aria-label="Tutup"
        onClick={() => close(true)}
        className="absolute inset-0 bg-ink/50"
      />
      <div className="relative w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden border border-line">
        <div className="bg-deep px-5 pt-5 pb-4 text-white flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192.png"
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 rounded-xl shrink-0 bg-white/10 object-contain p-1"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-acid leading-tight">Seven Bro!</p>
            <p className="text-[11px] text-white/70 mt-0.5">
              Pasang di layar utama — buka lebih cepat, seperti app biasa
            </p>
          </div>
          <button
            type="button"
            onClick={() => close(true)}
            aria-label="Nanti saja"
            className="shrink-0 h-7 w-7 flex items-center justify-center rounded-lg bg-white/10 text-white/70"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          {ios ? (
            <ol className="text-[12px] text-ink space-y-2 list-decimal pl-5 leading-snug">
              <li>
                Ketuk tombol <span className="font-bold">Bagikan</span> (kotak panah) di
                Safari
              </li>
              <li>
                Pilih <span className="font-bold">Tambahkan ke Layar Utama</span>
              </li>
              <li>
                Tekan <span className="font-bold">Tambah</span> — ikon bebek siap di home
              </li>
            </ol>
          ) : (
            <ol className="text-[12px] text-ink space-y-2 list-decimal pl-5 leading-snug">
              <li>
                Buka menu <span className="font-bold">⋮</span> (titik tiga) Chrome
              </li>
              <li>
                Pilih <span className="font-bold">Instal aplikasi</span> /{" "}
                <span className="font-bold">Tambahkan ke layar utama</span>
              </li>
              <li>
                Konfirmasi <span className="font-bold">Instal</span> /{" "}
                <span className="font-bold">Tambah</span>
              </li>
            </ol>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => void doInstall()}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-forest text-white text-[12px] font-bold py-3 active:scale-[0.98]"
            >
              <Download className="h-4 w-4" />
              {ios ? "Saya Mengerti" : "Instal Sekarang"}
            </button>
            <button
              type="button"
              onClick={() => close(true)}
              className="px-4 rounded-xl bg-page border border-line text-[12px] font-semibold text-ink-soft py-3"
            >
              Nanti
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
