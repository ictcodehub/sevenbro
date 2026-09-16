"use client"

import { useSession } from "next-auth/react"
import { useState, type ReactNode } from "react"
import { Shield, Wallet, CalendarDays, Megaphone, Trophy, Users } from "lucide-react"
import { SectionHeader, EmptyState } from "@/components/ui-primitives"

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

export default function AdminSettingsPage() {
  const { data: session, status } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role

  const [iuranOpen, setIuranOpen] = useState(true)
  const [agendaOpen, setAgendaOpen] = useState(true)
  const [poinOpen, setPoinOpen] = useState(true)
  const [infoOpen, setInfoOpen] = useState(true)

  if (status === "loading") {
    return (
      <div className="px-4 py-3">
        <p className="text-[11px] text-ink-soft/75">Memuat…</p>
      </div>
    )
  }

  if (role !== "HOMEROOM") {
    return (
      <div className="px-4 py-3">
        <EmptyState
          icon={<Shield className="h-6 w-6" />}
          message="Hanya homeroom yang boleh membuka pengaturan kelas"
        />
      </div>
    )
  }

  return (
    <div className="px-4 py-3 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Pengaturan Kelas</h1>
        <p className="text-[11px] text-ink-soft/75">Aktifkan / nonaktifkan fitur kelas 7B</p>
      </div>

      <div>
        <SectionHeader title="Fitur kelas" />
        <div className="space-y-1.5">
          <Toggle
            label="Iuran / Kas"
            hint="Bendahara & homeroom bisa kelola transaksi"
            on={iuranOpen}
            onChange={setIuranOpen}
            icon={<Wallet className="h-3.5 w-3.5 text-forest" />}
          />
          <Toggle
            label="Agenda kegiatan"
            hint="Ketua & sekretaris boleh tambah agenda"
            on={agendaOpen}
            onChange={setAgendaOpen}
            icon={<CalendarDays className="h-3.5 w-3.5 text-forest" />}
          />
          <Toggle
            label="Poin perilaku"
            hint="Homeroom beri poin, semua siswa lihat papan"
            on={poinOpen}
            onChange={setPoinOpen}
            icon={<Trophy className="h-3.5 w-3.5 text-forest" />}
          />
          <Toggle
            label="Pengumuman"
            hint="Homeroom & ketua boleh posting info"
            on={infoOpen}
            onChange={setInfoOpen}
            icon={<Megaphone className="h-3.5 w-3.5 text-forest" />}
          />
        </div>
      </div>

      <div>
        <SectionHeader title="Info kelas" />
        <div className="bg-white border border-line shadow-sm rounded-2xl p-4 text-[11px] text-ink-soft/75 space-y-2">
          <p className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-forest" />
            Kelas 7B — Mutiara Bangsa 2 JHS
          </p>
          <p>Homeroom: {session?.user?.name ?? "—"}</p>
          <p className="text-[10px] text-ink-soft/50">
            Toggle di atas bersifat lokal (state UI). Persistensi setting menyusul
            setelah tabel settings dibuat di Supabase.
          </p>
        </div>
      </div>

      <div className="h-2" />
    </div>
  )
}
