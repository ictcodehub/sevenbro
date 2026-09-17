"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  BellRing,
  History,
  LogOut,
  Moon,
  Smartphone,
  WifiOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { SectionHeader } from "@/components/ui-primitives"
import {
  DEFAULT_PREFS,
  applyDarkMode,
  applyPrefsPatch,
  loadPrefs,
  showBrowserNotification,
  type Prefs,
} from "@/lib/prefs"
import { formatDisplayName } from "@/lib/format"
import { formatRoleLabel } from "@/lib/roles"
import { clearSwrCache } from "@/lib/swr-store"

function Toggle({
  label,
  hint,
  on,
  onChange,
  icon,
}: {
  label: string
  hint?: string
  on: boolean
  onChange: (v: boolean) => void
  icon: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="w-full bg-white border border-line shadow-sm rounded-xl p-2.5 flex items-center gap-2.5 active:scale-[0.98] transition-transform"
      aria-pressed={on}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[11px] font-semibold text-ink truncate">{label}</p>
        {hint && <p className="text-[10px] text-ink-soft/75 truncate">{hint}</p>}
      </div>
      <span
        className={`h-5 w-9 rounded-full transition-colors relative shrink-0 ${
          on ? "bg-forest" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            on ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const stored = loadPrefs()
    setPrefs(stored)
    applyDarkMode(stored.dark)
    setReady(true)
  }, [])

  const update = async (patch: Partial<Prefs>) => {
    const next = await applyPrefsPatch(prefs, patch)
    if (!next) return
    setPrefs(next)
    if (patch.push === true) {
      showBrowserNotification(
        "Notifikasi Push Aktif",
        "Info pengumuman dan pengingat iuran akan muncul di perangkat ini."
      )
    }
  }

  return (
    <div className="px-4 py-3 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Pengaturan</h1>
        <p className="text-[11px] text-ink-soft/75">Preferensi aplikasi & akun</p>
      </div>

      {session?.user && (
        <div className="bg-white border border-line shadow-sm rounded-2xl p-3.5">
          <p className="text-[11px] font-semibold text-ink truncate">
            {formatDisplayName(session.user.name)}
          </p>
          <p className="text-[10px] text-ink-soft/75 truncate">{session.user.email}</p>
          <p className="mt-1 inline-flex items-center bg-forest/10 text-forest text-[9px] font-bold px-2 py-0.5 rounded-full">
            {formatRoleLabel((session.user as { role?: string }).role)}
          </p>
        </div>
      )}

      {ready && (
        <div>
          <SectionHeader title="Notifikasi & Tampilan" />
          <div className="space-y-1.5">
            <Toggle
              label="Notifikasi Push"
              hint="Info pengumuman baru dan pengingat iuran"
              on={prefs.push}
              onChange={(v) => {
                void update({ push: v })
              }}
              icon={<BellRing className="h-3.5 w-3.5 text-forest" />}
            />
            <Toggle
              label="Mode Gelap"
              hint="Tampilan gelap untuk mata yang lelah"
              on={prefs.dark}
              onChange={(v) => {
                void update({ dark: v })
              }}
              icon={<Moon className="h-3.5 w-3.5 text-forest" />}
            />
            <Toggle
              label="Mode Hemat Data"
              hint="Simpan halaman agar dapat dibuka tanpa internet"
              on={prefs.offline}
              onChange={(v) => {
                void update({ offline: v })
              }}
              icon={<WifiOff className="h-3.5 w-3.5 text-forest" />}
            />
            <button
              type="button"
              onClick={() => router.push("/app/notifications")}
              className="w-full bg-white border border-line shadow-sm rounded-xl p-2.5 flex items-center gap-2.5 active:scale-[0.98] transition-transform"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface shrink-0">
                <History className="h-3.5 w-3.5 text-forest" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[11px] font-semibold text-ink truncate">
                  Riwayat Notifikasi
                </p>
                <p className="text-[10px] text-ink-soft/75 truncate">
                  Lihat & pulihkan notifikasi yang dihapus
                </p>
              </div>
            </button>
          </div>
        </div>
      )}

      <div>
        <SectionHeader title="Tentang Aplikasi" />
        <div className="bg-white border border-line shadow-sm rounded-2xl p-4 text-[11px] text-ink-soft/75 space-y-2">
          <p className="flex items-center gap-2">
            <Smartphone className="h-3.5 w-3.5 text-forest" />
            Seven Bro! — Mutiara Bangsa 2 JHS
          </p>
          <p>
            Aplikasi kelas untuk Kas, Pengumuman, Agenda, dan Poin. Data tersambung
            ke Supabase untuk kelas 7B.
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        className="w-full h-12 text-red-600 hover:bg-red-50 hover:text-red-600"
        onClick={() => {
          clearSwrCache()
          void signOut({ callbackUrl: "/login" }).then(() => router.push("/login"))
        }}
      >
        <LogOut className="h-4 w-4" />
        Keluar dari akun
      </Button>

      <div className="h-2" />
    </div>
  )
}
