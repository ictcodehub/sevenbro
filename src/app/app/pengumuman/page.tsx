"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"
import { Megaphone, Pin, PinOff, Inbox, Plus, Trash2, Check } from "lucide-react"
import { SectionHeader, EmptyState } from "@/components/ui-primitives"
import { useAppSWR } from "@/lib/fetcher"
import { Sheet, Field, inputClass } from "@/components/ui/sheet"
import { canPostAnnouncement } from "@/lib/policies"
import { RoleGate } from "@/components/RoleGate"

type Announcement = {
  id: string
  title: string
  body: string
  pinned: boolean
  created_at: string
  created_by: string | null
}

function timeLabel(iso: string) {
  try {
    const diff = Date.now() - new Date(iso).getTime()
    const h = Math.floor(diff / 3_600_000)
    if (h < 1) return "Baru saja"
    if (h < 24) return `${h} jam lalu`
    const d = Math.floor(h / 24)
    return `${d} hari lalu`
  } catch {
    return iso
  }
}

const PAGE_ROLES = ["HOMEROOM", "KETUA", "BENDAHARA", "SEKRETARIS", "ANGGOTA"]

export default function PengumumanPage() {
  return (
    <RoleGate allow={PAGE_ROLES}>
      <PengumumanInner />
    </RoleGate>
  )
}

function PengumumanInner() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const canEdit = canPostAnnouncement(role ?? "")
  const { data, error, mutate } = useAppSWR<Announcement[]>("/api/announcements")

  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [pinned, setPinned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const sorted = [...(data ?? [])].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      +new Date(b.created_at) - +new Date(a.created_at),
  )

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const create = async () => {
    setErr(null)
    if (!title.trim() || !body.trim()) {
      setErr("Judul dan isi wajib diisi")
      return
    }
    setSaving(true)
    try {
      const r = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: body.trim(), pinned }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || `Gagal (${r.status})`)
      setOpen(false)
      setTitle("")
      setBody("")
      setPinned(false)
      flash("Pengumuman terbit")
      await mutate()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan")
    } finally {
      setSaving(false)
    }
  }

  const togglePin = async (a: Announcement) => {
    try {
      const r = await fetch(`/api/announcements/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !a.pinned }),
      })
      if (!r.ok) {
        const b = await r.json().catch(() => null)
        throw new Error(b?.error || "Gagal")
      }
      flash(a.pinned ? "Sematan dilepas" : "Disematkan")
      await mutate()
    } catch (e) {
      flash(e instanceof Error ? e.message : "Gagal")
    }
  }

  const remove = async (a: Announcement) => {
    if (!confirm(`Hapus “${a.title}”?`)) return
    try {
      const r = await fetch(`/api/announcements/${a.id}`, { method: "DELETE" })
      if (!r.ok) {
        const b = await r.json().catch(() => null)
        throw new Error(b?.error || "Gagal")
      }
      flash("Dihapus")
      await mutate()
    } catch (e) {
      flash(e instanceof Error ? e.message : "Gagal")
    }
  }

  return (
    <div className="px-4 py-3 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-ink">Pengumuman</h1>
          <p className="text-[11px] text-ink-soft/75">Info penting dari guru & ketua kelas</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1 bg-forest text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-xl active:scale-[0.97] transition-transform shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Baru
          </button>
        )}
      </div>

      <div>
        <SectionHeader title="Semua pengumuman" count={String(sorted.length)} />
        {error ? (
          <EmptyState icon={<Inbox className="h-6 w-6" />} message="Gagal memuat pengumuman" />
        ) : sorted.length === 0 ? (
          <EmptyState icon={<Inbox className="h-6 w-6" />} message="Belum ada pengumuman" />
        ) : (
          <div className="space-y-2">
            {sorted.map((a) => (
              <article
                key={a.id}
                className="bg-white border border-line shadow-sm rounded-2xl p-3.5"
              >
                <div className="flex items-center gap-1.5 mb-1">
                  {a.pinned && (
                    <span className="inline-flex items-center gap-0.5 bg-amber/15 text-amber rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                      <Pin className="h-2.5 w-2.5" />
                      Disematkan
                    </span>
                  )}
                  <span className="text-[10px] text-ink-soft/75">{timeLabel(a.created_at)}</span>
                </div>
                <h2 className="text-sm font-bold text-ink">{a.title}</h2>
                <p className="mt-0.5 text-[11px] text-ink-soft/75 leading-relaxed line-clamp-3">
                  {a.body}
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-[10px] text-ink-soft/50 flex items-center gap-1">
                    <Megaphone className="h-2.5 w-2.5" />
                    {a.created_by || "Kelas 7B"}
                  </p>
                  {canEdit && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => void togglePin(a)}
                        aria-label={a.pinned ? "Lepas sematan" : "Sematkan"}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-amber hover:bg-amber/10"
                      >
                        {a.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(a)}
                        aria-label="Hapus"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-alert hover:bg-alert-bg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-forest text-white text-[11px] font-semibold px-3 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Pengumuman baru">
        {err && (
          <p className="text-[11px] text-alert bg-alert-bg border border-alert/20 rounded-xl px-3 py-2">
            {err}
          </p>
        )}
        <Field label="Judul">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
            placeholder="Jadwal piket…"
          />
        </Field>
        <Field label="Isi">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className={inputClass + " resize-none"}
            placeholder="Tulis info untuk kelas…"
          />
        </Field>
        <button
          type="button"
          onClick={() => setPinned((v) => !v)}
          className="w-full flex items-center justify-between rounded-xl border border-line bg-page px-3 py-2.5"
        >
          <span className="text-[11px] font-semibold text-ink">Sematkan di beranda</span>
          <span
            className={`h-5 w-9 rounded-full relative transition-colors ${
              pinned ? "bg-forest" : "bg-line"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
                pinned ? "left-[18px]" : "left-0.5"
              }`}
            />
          </span>
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void create()}
          className="w-full bg-forest text-white text-[12px] font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {saving ? "Menyimpan…" : "Terbitkan"}
        </button>
      </Sheet>

      <div className="h-2" />
    </div>
  )
}
