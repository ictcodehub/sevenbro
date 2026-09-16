"use client"

import { useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import { BellRing, LogOut, Moon, Smartphone, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SectionHeader } from "@/components/ui-primitives"

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
  const [push, setPush] = useState(false)
  const [dark, setDark] = useState(false)
  const [offline, setOffline] = useState(true)

  return (
    <div className="px-4 py-3 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Pengaturan</h1>
        <p className="text-[11px] text-ink-soft/75">Preferensi aplikasi & akun</p>
      </div>

      {session?.user && (
        <div className="bg-white border border-line shadow-sm rounded-2xl p-3.5">
          <p className="text-[11px] font-semibold text-ink truncate">
            {session.user.name}
          </p>
          <p className="text-[10px] text-ink-soft/75 truncate">{session.user.email}</p>
          <p className="mt-1 inline-flex items-center bg-forest/10 text-forest text-[9px] font-bold px-2 py-0.5 rounded-full">
            {(session.user as { role?: string }).role ?? "PENDING"}
          </p>
        </div>
      )}

      <div>
        <SectionHeader title="Notifikasi & tampilan" />
        <div className="space-y-1.5">
          <Toggle
            label="Notifikasi push"
            hint="Info pengumuman baru & reminder iuran"
            on={push}
            onChange={setPush}
            icon={<BellRing className="h-3.5 w-3.5 text-forest" />}
          />
          <Toggle
            label="Mode gelap"
            hint="Token gelap sudah siap di globals.css"
            on={dark}
            onChange={setDark}
            icon={<Moon className="h-3.5 w-3.5 text-forest" />}
          />
          <Toggle
            label="Mode hemat data"
            hint="Simpan halaman supaya bisa dibuka tanpa internet"
            on={offline}
            onChange={setOffline}
            icon={<WifiOff className="h-3.5 w-3.5 text-forest" />}
          />
        </div>
      </div>

      <div>
        <SectionHeader title="Tentang aplikasi" />
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
