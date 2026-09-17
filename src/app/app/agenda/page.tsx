"use client"

import { useSession } from "next-auth/react"
import { useMemo, useState } from "react"
import {
  CalendarDays,
  Clock,
  MapPin,
  Inbox,
  Plus,
  Trash2,
  Check,
  Pencil,
} from "lucide-react"
import { SectionHeader, EmptyState } from "@/components/ui-primitives"
import { useAppSWR } from "@/lib/fetcher"
import { formatDateID, formatTimeID } from "@/lib/format"
import { Sheet, Field, inputClass } from "@/components/ui/sheet"
import { canManageAgenda } from "@/lib/policies"
import { RoleGate } from "@/components/RoleGate"

type EventRow = {
  id: string
  title: string
  location: string | null
  starts_at: string
}

// Sementara: hanya Homeroom — menu Agenda dinonaktifkan untuk murid
const PAGE_ROLES = ["HOMEROOM"]

function dayKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

function dayLabel(d: Date) {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)
  const base = formatDateID(d)
  if (dayKey(d) === dayKey(today)) return `Hari Ini · ${base}`
  if (dayKey(d) === dayKey(tomorrow)) return `Besok · ${base}`
  return base
}

function toLocalInputValue(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AgendaPage() {
  return (
    <RoleGate allow={PAGE_ROLES}>
      <AgendaInner />
    </RoleGate>
  )
}

function AgendaInner() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const canEdit = canManageAgenda(role ?? "")
  const { data, error, mutate } = useAppSWR<EventRow[]>("/api/events")

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<EventRow | null>(null)
  const [title, setTitle] = useState("")
  const [location, setLocation] = useState("")
  const [when, setWhen] = useState("")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const groups = useMemo(() => {
    const map = new Map<string, { date: Date; events: EventRow[] }>()
    for (const ev of data ?? []) {
      const d = new Date(ev.starts_at)
      const key = dayKey(d)
      const entry = map.get(key) ?? { date: d, events: [] }
      entry.events.push(ev)
      map.set(key, entry)
    }
    return [...map.entries()]
  }, [data])

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const openCreate = () => {
    setEditing(null)
    setTitle("")
    setLocation("")
    setWhen("")
    setErr(null)
    setOpen(true)
  }

  const openEdit = (ev: EventRow) => {
    setEditing(ev)
    setTitle(ev.title)
    setLocation(ev.location ?? "")
    setWhen(toLocalInputValue(ev.starts_at))
    setErr(null)
    setOpen(true)
  }

  const closeSheet = () => {
    setOpen(false)
    setEditing(null)
  }

  const save = async () => {
    setErr(null)
    if (!title.trim() || !when) {
      setErr("Judul dan waktu wajib diisi")
      return
    }
    setSaving(true)
    try {
      const startsAt = new Date(when).toISOString()
      if (editing) {
        const r = await fetch(`/api/events/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            starts_at: startsAt,
            location: location.trim() || null,
          }),
        })
        const b = await r.json().catch(() => null)
        if (!r.ok) throw new Error(b?.error || `Gagal (${r.status})`)
        flash("Agenda diperbarui")
      } else {
        const r = await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            starts_at: startsAt,
            location: location.trim() || null,
          }),
        })
        const b = await r.json().catch(() => null)
        if (!r.ok) throw new Error(b?.error || `Gagal (${r.status})`)
        flash("Agenda ditambahkan")
      }
      closeSheet()
      setTitle("")
      setLocation("")
      setWhen("")
      await mutate()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan")
    } finally {
      setSaving(false)
    }
  }

  const remove = async (ev: EventRow) => {
    if (!confirm(`Hapus “${ev.title}”?`)) return
    try {
      const r = await fetch(`/api/events/${ev.id}`, { method: "DELETE" })
      if (!r.ok) {
        const b = await r.json().catch(() => null)
        throw new Error(b?.error || "Gagal")
      }
      flash("Agenda dihapus")
      await mutate()
    } catch (e) {
      flash(e instanceof Error ? e.message : "Gagal")
    }
  }

  return (
    <div className="px-4 py-3 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-ink">Agenda</h1>
          <p className="text-[11px] text-ink-soft/75">Kegiatan kelas & sekolah mendatang</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1 bg-forest text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-xl active:scale-[0.97] transition-transform shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah
          </button>
        )}
      </div>

      {error ? (
        <EmptyState icon={<Inbox className="h-6 w-6" />} message="Gagal memuat agenda" />
      ) : groups.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          message="Belum ada agenda mendatang"
        />
      ) : (
        groups.map(([, { date, events }]) => (
          <div key={dayKey(date)}>
            <SectionHeader title={dayLabel(date)} count={String(events.length)} />
            <div className="space-y-1.5">
              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="bg-white border border-line shadow-sm rounded-xl p-2.5 flex items-center gap-2.5"
                >
                  <div className="flex h-10 w-10 flex-col items-center justify-center rounded-lg bg-forest/10 shrink-0">
                    <span className="text-[11px] font-bold text-forest leading-none">
                      {formatTimeID(new Date(ev.starts_at))}
                    </span>
                    <Clock className="h-2.5 w-2.5 text-forest/60 mt-0.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-ink truncate">{ev.title}</p>
                    <p className="flex items-center gap-1 text-[10px] text-ink-soft/75">
                      <MapPin className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">{ev.location || "Lokasi belum ditentukan"}</span>
                    </p>
                  </div>
                  {canEdit && (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(ev)}
                        aria-label="Ubah agenda"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft hover:bg-surface"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(ev)}
                        aria-label="Hapus agenda"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-alert hover:bg-alert-bg"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-forest text-white text-[11px] font-semibold px-3 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <Sheet
        open={open}
        onClose={closeSheet}
        title={editing ? "Ubah Agenda" : "Agenda Baru"}
      >
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
            placeholder="Upacara / ulangan / rapat…"
          />
        </Field>
        <Field label="Lokasi">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputClass}
            placeholder="Kelas 7B / Lapangan"
          />
        </Field>
        <Field label="Waktu Mulai">
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className={inputClass}
          />
        </Field>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="w-full bg-forest text-white text-[12px] font-semibold py-2.5 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <Check className="h-4 w-4" />
          {saving ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Simpan Agenda"}
        </button>
      </Sheet>

      <div className="h-2" />
    </div>
  )
}
