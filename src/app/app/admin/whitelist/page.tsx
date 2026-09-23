"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { Shield, Trash2 } from "lucide-react"
import { SectionCard, EmptyState } from "@/components/ui-primitives"
import { inputClass } from "@/components/ui/sheet"
import { canAdmin } from "@/lib/policies"
import { useT } from "@/lib/i18n"

type AllowlistRow = {
  id: string
  email: string
  note: string | null
  created_by: string | null
  created_at: string
}

export default function LoginAllowlistPage() {
  const { data: session, status } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const t = useT()

  const [rows, setRows] = useState<AllowlistRow[]>([])
  const [email, setEmail] = useState("")
  const [note, setNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const load = async () => {
    setLoading(true)
    try {
      const r = await fetch("/api/admin/login-allowlist", {
        headers: { Accept: "application/json" },
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || t("common.failedWithStatus", { status: r.status }))
      if (Array.isArray(b)) setRows(b as AllowlistRow[])
    } catch (e) {
      flash(e instanceof Error ? e.message : t("common.failed"))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated" && canAdmin(role ?? "")) {
      void load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, role])

  if (status === "loading") {
    return (
      <div className="px-4 py-3">
        <p className="text-[11px] text-ink-soft/75">{t("common.loading")}</p>
      </div>
    )
  }

  if (!canAdmin(role ?? "")) {
    return (
      <div className="px-4 py-3">
        <EmptyState
          icon={<Shield className="h-6 w-6" />}
          message={t("adminSettings.accessDenied")}
        />
      </div>
    )
  }

  const add = async () => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) {
      flash(t("roster.emailRequired"))
      return
    }
    setSaving(true)
    try {
      const r = await fetch("/api/admin/login-allowlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, note: note.trim() || null }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || t("roster.allowlistAddFailed"))
      setEmail("")
      setNote("")
      flash(t("roster.allowlistAdded"))
      await load()
    } catch (e) {
      flash(e instanceof Error ? e.message : t("common.failed"))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (id: string) => {
    try {
      const r = await fetch(`/api/admin/login-allowlist?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      if (!r.ok) {
        const b = await r.json().catch(() => null)
        throw new Error(b?.error || t("common.failed"))
      }
      setRows((prev) => prev.filter((x) => x.id !== id))
      flash(t("roster.allowlistDeleted"))
    } catch (e) {
      flash(e instanceof Error ? e.message : t("common.failed"))
    }
  }

  return (
    <div className="px-4 py-3 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">{t("roster.allowlistTitle")}</h1>
        <p className="text-xs text-ink-soft/70 mt-0.5 leading-snug">
          {t("roster.allowlistHint")}
        </p>
      </div>

      <SectionCard title={t("roster.allowlistTitle")} count={rows.length}>
        <div className="rounded-xl border border-line bg-page p-2.5 space-y-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="guru.mapel@mutiarabangsa.sch.id"
            className={inputClass}
            type="email"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("roster.allowlistNote")}
            className={inputClass}
          />
          <button
            type="button"
            disabled={saving || !email.trim()}
            onClick={() => void add()}
            className="w-full bg-forest text-white text-xs font-semibold py-2 rounded-full flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Shield className="h-3.5 w-3.5" />
            {saving ? t("kas.saving") : t("roster.allowlistAdd")}
          </button>
        </div>

        {loading ? (
          <p className="text-[11px] text-ink-soft/75">{t("common.loading")}</p>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Shield className="h-6 w-6" />}
            message={t("roster.allowlistEmpty")}
          />
        ) : (
          <div className="rounded-xl border border-line bg-page divide-y divide-line/60">
            {rows.map((row) => (
              <div key={row.id} className="p-2.5 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white border border-line shrink-0">
                  <Shield className="h-3.5 w-3.5 text-forest" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink truncate">{row.email}</p>
                  {row.note && (
                    <p className="text-[11px] text-ink-soft/70 truncate">{row.note}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void remove(row.id)}
                  aria-label={t("roster.allowlistDeleteAria")}                    className="flex h-7 w-7 items-center justify-center rounded-lg text-alert active:bg-alert-bg shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-forest text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
