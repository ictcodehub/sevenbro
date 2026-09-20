"use client"

import { useSession } from "next-auth/react"
import { useMemo, useState } from "react"
import {
  CalendarDays,
  Inbox,
  Plus,
  Check,
  Pencil,
  Trash2,
} from "lucide-react"
import { EmptyState, Timeline, TimelineItem } from "@/components/ui-primitives"
import { useAppSWR } from "@/lib/fetcher"
import { formatDateID, formatTimeID } from "@/lib/format"
import { Sheet, Field } from "@/components/ui/sheet"
import { canManageAgenda } from "@/lib/policies"
import { RoleGate } from "@/components/RoleGate"
import FeatureGate from "@/components/FeatureGate"

type EventRow = {
  id: string
  title: string
  location: string | null
  description: string | null
  starts_at: string
}

// Agenda dibuka untuk siswa aktif; manage tetap via canManageAgenda
const PAGE_ROLES = ["HOMEROOM", "KETUA", "BENDAHARA", "SEKRETARIS", "ANGGOTA"]
const PAGE_LIMIT = 15

function toLocalInputValue(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AgendaPage() {
  return (
    <RoleGate allow={PAGE_ROLES}>
      <FeatureGate feature="agenda_enabled" label="Agenda">
        <AgendaInner />
      </FeatureGate>
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
  const [description, setDescription] = useState("")
  const [when, setWhen] = useState("")
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [page, setPage] = useState(0)

  // Paling dekat “sekarang” di atas → timeline vertical
  const sorted = useMemo(() => {
    const now = Date.now()
    return [...(data ?? [])].sort((a, b) => {
      const da = Math.abs(+new Date(a.starts_at) - now)
      const db = Math.abs(+new Date(b.starts_at) - now)
      if (da !== db) return da - db
      return +new Date(a.starts_at) - +new Date(b.starts_at)
    })
  }, [data])

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_LIMIT))
  const safePage = Math.min(page, pageCount - 1)
  const pageItems = sorted.slice(safePage * PAGE_LIMIT, (safePage + 1) * PAGE_LIMIT)

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const openCreate = () => {
    setEditing(null)
    setTitle("")
    setLocation("")
    setDescription("")
    setWhen("")
    setErr(null)
    setOpen(true)
  }

  const openEdit = (ev: EventRow) => {
    setEditing(ev)
    setTitle(ev.title)
    setLocation(ev.location ?? "")
    setDescription(ev.description ?? "")
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
            description: description.trim() || null,
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
            description: description.trim() || null,
          }),
        })
        const b = await r.json().catch(() => null)
        if (!r.ok) throw new Error(b?.error || `Gagal (${r.status})`)
        flash("Agenda ditambahkan")
      }
      closeSheet()
      setTitle("")
      setLocation("")
      setDescription("")
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
          <p className="text-xs text-ink-soft/75">Kegiatan kelas & sekolah mendatang</p>
        </div>
        {canEdit && (
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-1 bg-forest text-white text-sm font-semibold px-3 py-1.5 rounded-xl active:scale-[0.97] transition-transform shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Tambah
          </button>
        )}
      </div>

      {error ? (
        <EmptyState icon={<Inbox className="h-6 w-6" />} message="Gagal memuat agenda" />
      ) : pageItems.length === 0 ? (
        <EmptyState
          icon={<CalendarDays className="h-6 w-6" />}
          message="Belum ada agenda mendatang"
        />
      ) : (
        <Timeline>
          {pageItems.map((ev, i) => {
            const d = new Date(ev.starts_at)
            const isNearest = i === 0
            const isLast = i === pageItems.length - 1

            return (
              <TimelineItem
                key={ev.id}
                time={`${formatDateID(d)} · ${formatTimeID(d)}`}
                title={ev.title}
                location={ev.location || "Lokasi belum ditentukan"}
                description={ev.description}
                isActive={isNearest}
                isLast={isLast}
                actions={
                  canEdit ? (
                    <button
                      type="button"
                      onClick={() => openEdit(ev)}
                      aria-label="Ubah agenda"
                      className="flex h-10 w-9 items-center justify-center rounded-lg text-ink-soft active:bg-surface"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  ) : undefined
                }
              />
            )
          })}
        </Timeline>
      )}

      {sorted.length > PAGE_LIMIT && (
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="min-h-9 rounded-full border border-line bg-white px-3 text-sm font-semibold text-ink disabled:opacity-40"
          >
            Sebelumnya
          </button>
          <span className="text-xs text-ink-soft/70">
            {safePage + 1} / {pageCount} · max {PAGE_LIMIT} per halaman
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="min-h-9 rounded-full border border-line bg-white px-3 text-sm font-semibold text-ink disabled:opacity-40"
          >
            Berikutnya
          </button>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-forest text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <Sheet
        open={open}
        onClose={closeSheet}
        title={editing ? "Ubah Agenda" : "Agenda Baru"}
        fullHeight
      >
        {err && (
          <p className="text-xs text-alert bg-alert-bg border border-alert/20 rounded-xl px-3 py-2">
            {err}
          </p>
        )}
        <Field label="Judul">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-forest/40 bg-white px-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-forest/25 focus:border-forest"
            placeholder="Upacara / ulangan / rapat…"
          />
        </Field>
        <Field label="Lokasi">
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-forest/40 bg-white px-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-forest/25 focus:border-forest"
            placeholder="Kelas 7B / Lapangan"
          />
        </Field>
        <Field label="Waktu Mulai">
          <input
            type="datetime-local"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-forest/40 bg-white px-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-forest/25 focus:border-forest"
          />
        </Field>
        {/* Field opsional — SSOT DESIGN_SYSTEM § Field opsional */}
        <label className="block space-y-1 min-w-0">
          <span className="block text-xs font-medium text-ink-soft">
            Deskripsi
            <span className="ml-1 font-normal text-ink-soft/55">opsional</span>
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={12}
            placeholder="Detail tambahan agenda…"
            className="min-h-[14rem] w-full resize-none scroll-y-only rounded-xl border border-forest/45 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/45 focus:outline-none focus:ring-2 focus:ring-forest/25 focus:border-forest"
          />
        </label>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="flex w-full items-center justify-center gap-1 rounded-full bg-forest px-2.5 py-2.5 text-sm font-semibold text-white active:scale-[0.97] transition-transform disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          {saving ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Simpan Agenda"}
        </button>
        {/* Hapus — hanya di editor (bukan saat create) */}
        {editing && (
          <button
            type="button"
            onClick={() => void remove(editing)}
            className="flex w-full items-center justify-center gap-1.5 rounded-full border border-alert/40 bg-white px-2.5 py-2.5 text-sm font-semibold text-alert active:scale-[0.97] transition-transform"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Hapus Agenda
          </button>
        )}
      </Sheet>

      <div className="h-2" />
    </div>
  )
}
