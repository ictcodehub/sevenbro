"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState, type ReactNode } from "react"
import { Shield, Wallet, CalendarDays, Megaphone, Trophy, Users } from "lucide-react"
import { EmptyState } from "@/components/ui-primitives"
import { formatDisplayName } from "@/lib/format"
import { useAppSWR } from "@/lib/fetcher"
import SubjectTeachersAdmin from "@/components/admin/SubjectTeachersAdmin"
import type { ClassSettings } from "@/lib/class-settings"
import { useT } from "@/lib/i18n"

/** Frame section standar (seragam Tugas / Membawa & Guru Mapel) */
function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
      <div className="border-b border-line bg-page px-3 py-2.5">
        <p className="text-sm font-bold text-ink">{title}</p>
        {subtitle && (
          <p className="text-xs text-ink-soft/70 leading-snug mt-0.5">{subtitle}</p>
        )}
      </div>
      <div className="p-3 space-y-1.5">{children}</div>
    </div>
  )
}

function Toggle({
  label,
  hint,
  on,
  onChange,
  icon,
  busy,
}: {
  label: string
  hint?: string
  on: boolean
  onChange: (v: boolean) => void
  icon: ReactNode
  busy?: boolean
}) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => onChange(!on)}
      className="w-full bg-page border border-line rounded-xl p-2.5 flex items-center gap-2.5 active:scale-[0.98] transition-transform disabled:opacity-60"
      aria-pressed={on}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-line shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-sm font-semibold text-ink truncate">{label}</p>
        {hint && <p className="text-xs text-ink-soft/75 truncate">{hint}</p>}
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

type SettingsPayload = ClassSettings & { updated_at?: string | null }

export default function AdminSettingsPage() {
  const { data: session, status } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const { data, mutate } = useAppSWR<SettingsPayload>("/api/admin/class-settings")

  const [draft, setDraft] = useState<ClassSettings>({
    kas_enabled: true,
    agenda_enabled: true,
    poin_enabled: true,
    info_enabled: true,
  })
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const t = useT()

  useEffect(() => {
    if (!data) return
    setDraft({
      kas_enabled: data.kas_enabled !== false,
      agenda_enabled: data.agenda_enabled !== false,
      poin_enabled: data.poin_enabled !== false,
      info_enabled: data.info_enabled !== false,
    })
  }, [data])

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const saveToggle = async (key: keyof ClassSettings, next: boolean) => {
    setErr(null)
    setDraft((p) => ({ ...p, [key]: next }))
    setBusyKey(key)
    try {
      const r = await fetch("/api/admin/class-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || t("common.failedWithStatus", { status: r.status }))
      flash(t(next ? "feature.enabled" : "feature.disabledStudents"))
      await mutate()
    } catch (e) {
      setDraft((p) => ({ ...p, [key]: !next }))
      setErr(e instanceof Error ? e.message : t("common.saveFailed"))
    } finally {
      setBusyKey(null)
    }
  }

  if (status === "loading") {
    return (
      <div className="px-4 py-3">
          <p className="text-xs text-ink-soft/75">{t("common.loading")}</p>
      </div>
    )
  }

  if (role !== "HOMEROOM") {
    return (
      <div className="px-4 py-3">
        <EmptyState
          icon={<Shield className="h-6 w-6" />}
          message={t("adminSettings.accessDenied")}
        />
      </div>
    )
  }

  return (
    <div className="px-4 py-3 space-y-3">
      <div>
          <h1 className="text-lg font-bold text-ink">{t("nav.classSettings")}</h1>
          <p className="text-xs text-ink-soft/75">
            {t("adminSettings.subtitle")}
          </p>
      </div>

      {err && (
        <p className="text-xs text-alert bg-alert-bg border border-alert/20 rounded-xl px-3 py-2">
          {err}
        </p>
      )}

      <SectionCard
        title={t("adminSettings.features")}
        subtitle={t("adminSettings.featuresHint")}
      >
        <Toggle
          label={t("adminSettings.kas")}
          hint={t("adminSettings.kasHint")}
          on={draft.kas_enabled}
          busy={busyKey === "kas_enabled"}
          onChange={(v) => void saveToggle("kas_enabled", v)}
          icon={<Wallet className="h-3.5 w-3.5 text-forest" />}
        />
        <Toggle
          label={t("agenda.title")}
          hint={t("adminSettings.agendaHint")}
          on={draft.agenda_enabled}
          busy={busyKey === "agenda_enabled"}
          onChange={(v) => void saveToggle("agenda_enabled", v)}
          icon={<CalendarDays className="h-3.5 w-3.5 text-forest" />}
        />
        <Toggle
          label={t("poin.title")}
          hint={t("adminSettings.poinHint")}
          on={draft.poin_enabled}
          busy={busyKey === "poin_enabled"}
          onChange={(v) => void saveToggle("poin_enabled", v)}
          icon={<Trophy className="h-3.5 w-3.5 text-forest" />}
        />
        <Toggle
          label={t("adminSettings.info")}
          hint={t("adminSettings.infoHint")}
          on={draft.info_enabled}
          busy={busyKey === "info_enabled"}
          onChange={(v) => void saveToggle("info_enabled", v)}
          icon={<Megaphone className="h-3.5 w-3.5 text-forest" />}
        />
      </SectionCard>

      <SubjectTeachersAdmin />

      <SectionCard title={t("adminSettings.classInfo")} subtitle={t("adminSettings.classInfoHint")}>
        <div className="text-xs text-ink-soft/75 space-y-2">
          <p className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-forest" />
            Kelas 7B — Mutiara Bangsa 2 JHS
          </p>
          <p>Homeroom: {formatDisplayName(session?.user?.name) || "—"}</p>
          <p className="text-xs text-ink-soft/50">
            {t("adminSettings.toggleNote")}
          </p>
        </div>
      </SectionCard>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-forest text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="h-2" />
    </div>
  )
}
