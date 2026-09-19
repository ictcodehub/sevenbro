"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"
import {
  Megaphone,
  Pin,
  Inbox,
  Plus,
  Trash2,
  Check,
  Pencil,
  PenLine,
} from "lucide-react"
import { EmptyState } from "@/components/ui-primitives"
import { useAppSWR } from "@/lib/fetcher"
import { Sheet, Field } from "@/components/ui/sheet"
import { canPostAnnouncement } from "@/lib/policies"
import { RoleGate } from "@/components/RoleGate"
import FeatureGate from "@/components/FeatureGate"
import InfoBriefForm, {
  type InfoBriefEditData,
} from "@/components/InfoBriefForm"
import {
  formatBriefDateLong,
  relativeDayLabel,
  dateKeyWIB,
  type SubjectRow,
  type SubjectTeacherRow,
} from "@/lib/info-brief"
import { formatDisplayName } from "@/lib/format"

type Announcement = {
  id: string
  title: string
  body: string
  pinned: boolean
  created_at: string
  created_by: string | null
}

type StudentLite = {
  id: string
  full_name: string
  position?: string | null
  active?: boolean
}

type BriefRow = {
  id: string
  date: string
  title: string
  announcement_id: string | null
  greeting?: string | null
  uniform: string | null
  uniform_note?: string | null
  pinned?: boolean
  payload: {
    subjects?: {
      subject_id?: string | null
      name?: string
      short_name?: string | null
      jp?: number
      time?: string | null
      session?: number | null
      teacher?: string | null
    }[]
    duties?: { student_id?: string | null; name?: string }[]
    items?: {
      kind?: "BRING" | "TASK" | "EVENT_NOTE" | "CUSTOM"
      text?: string
      subject_name?: string | null
      audience?: "ALL" | "NAMED" | "REMEDIAL"
      student_names?: string[]
      event_title?: string | null
      group?: "tugas" | "remedial" | "info"
    }[]
  }
}

const PAGE_LIMIT = 15

function WaBody({ text }: { text: string }) {
  return (
    <div className="mt-1.5 whitespace-pre-wrap text-[10px] leading-[1.4] text-ink">
      {text.split("\n").map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />
        const parts = line.split(/(\*[^*]+\*)/g)
        return (
          <p key={i} className="min-w-0">
            {parts.map((part, j) => {
              if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
                return (
                  <strong key={j} className="font-bold text-ink">
                    {part.slice(1, -1)}
                  </strong>
                )
              }
              return <span key={j}>{part}</span>
            })}
          </p>
        )
      })}
    </div>
  )
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

function authorLabel(raw: string | null) {
  if (!raw) return "Kelas 7B"
  if (raw.includes("@")) return raw.split("@")[0]
  return formatDisplayName(raw)
}

/** Buang “ - Senin, 21 September 2026” dari judul brief lama di DB */
function briefDisplayTitle(title: string) {
  const i = title.indexOf(" - ")
  return i > 0 ? title.slice(0, i) : title
}

/** Toggle pin di pojok kanan-atas card — ON amber · OFF abu + coretan */
function PinCardToggle({
  pinned,
  onToggle,
}: {
  pinned: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={pinned ? "Lepas sematan" : "Sematkan"}
      aria-pressed={pinned}
      title={pinned ? "Lepas sematan" : "Sematkan"}
      className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg active:bg-amber/10 ${
        pinned ? "text-amber" : "text-ink-soft/40"
      }`}
    >
      <span className="relative inline-flex h-4 w-4 items-center justify-center">
        <Pin className="h-4 w-4" />
        {!pinned && (
          <span
            aria-hidden
            className="absolute left-[-2px] right-[-2px] top-1/2 h-px -translate-y-1/2 rotate-[-45deg] bg-current"
          />
        )}
      </span>
    </button>
  )
}

const PAGE_ROLES = ["HOMEROOM", "KETUA", "BENDAHARA", "SEKRETARIS", "ANGGOTA"]

export default function PengumumanPage() {
  return (
    <RoleGate allow={PAGE_ROLES}>
      <FeatureGate feature="info_enabled" label="Info">
        <PengumumanInner />
      </FeatureGate>
    </RoleGate>
  )
}

function PengumumanInner() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const canEdit = canPostAnnouncement(role ?? "")
  const { data, error, mutate } = useAppSWR<Announcement[]>("/api/announcements")
  const { data: briefs } = useAppSWR<BriefRow[]>(
    canEdit ? "/api/info-briefs?limit=60" : null,
  )
  const { data: subjects } = useAppSWR<SubjectRow[]>(
    canEdit ? "/api/subjects" : null,
  )
  const { data: subjectTeachers } = useAppSWR<SubjectTeacherRow[]>(
    canEdit ? "/api/subject-teachers" : null,
  )
  const { data: students } = useAppSWR<StudentLite[]>(
    canEdit ? "/api/admin/students" : null,
  )

  const [open, setOpen] = useState(false)
  const [briefOpen, setBriefOpen] = useState(false)
  const [editBrief, setEditBrief] = useState<InfoBriefEditData | null>(null)
  const [page, setPage] = useState(0)
  const [editing, setEditing] = useState<Announcement | null>(null)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [pinned, setPinned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const briefByAnn = new Map<string, BriefRow>()
  for (const b of briefs ?? []) {
    if (b.announcement_id) briefByAnn.set(b.announcement_id, b)
  }

  const sorted = [...(data ?? [])].sort(
    (a, b) =>
      Number(b.pinned) - Number(a.pinned) ||
      +new Date(b.created_at) - +new Date(a.created_at),
  )
  const todayKey = dateKeyWIB(new Date())
  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_LIMIT))
  const safePage = Math.min(page, pageCount - 1)
  const pageItems = sorted.slice(
    safePage * PAGE_LIMIT,
    safePage * PAGE_LIMIT + PAGE_LIMIT,
  )

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const openCreate = () => {
    setEditing(null)
    setTitle("")
    setBody("")
    setPinned(false)
    setErr(null)
    setOpen(true)
  }

  const openEdit = (a: Announcement) => {
    const brief = briefByAnn.get(a.id)
    if (brief) {
      setEditBrief({
        id: brief.id,
        date: brief.date,
        greeting: brief.greeting ?? null,
        uniform: brief.uniform,
        uniform_note: brief.uniform_note ?? null,
        pinned: brief.pinned,
        payload: brief.payload,
      })
      setBriefOpen(true)
      return
    }
    setEditing(a)
    setTitle(a.title)
    setBody(a.body)
    setPinned(a.pinned)
    setErr(null)
    setOpen(true)
  }

  const closeSheet = () => {
    setOpen(false)
    setEditing(null)
  }

  const closeBriefForm = () => {
    setBriefOpen(false)
    setEditBrief(null)
  }

  const save = async () => {
    setErr(null)
    if (!title.trim() || !body.trim()) {
      setErr("Judul dan isi wajib diisi")
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const r = await fetch(`/api/announcements/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            body: body.trim(),
            pinned,
          }),
        })
        const b = await r.json().catch(() => null)
        if (!r.ok) throw new Error(b?.error || `Gagal (${r.status})`)
        flash("Pengumuman diperbarui")
      } else {
        const r = await fetch("/api/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), body: body.trim(), pinned }),
        })
        const b = await r.json().catch(() => null)
        if (!r.ok) throw new Error(b?.error || `Gagal (${r.status})`)
        flash("Pengumuman diterbitkan")
      }
      closeSheet()
      setTitle("")
      setBody("")
      setPinned(false)
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
    if (!confirm(`Hapus "${a.title}"?`)) return
    try {
      const r = await fetch(`/api/announcements/${a.id}`, { method: "DELETE" })
      if (!r.ok) {
        const b = await r.json().catch(() => null)
        throw new Error(b?.error || "Gagal")
      }
      flash("Pengumuman dihapus")
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
          <p className="text-[11px] text-ink-soft/75">
            Info penting dari guru & pengurus kelas
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEditBrief(null)
                setBriefOpen(true)
              }}
              className="inline-flex items-center gap-1 rounded-full bg-forest text-white text-[10px] font-semibold px-2.5 py-1.5 active:scale-[0.97] transition-transform"
            >
              <PenLine className="h-3 w-3" />
              Info
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1 rounded-full border border-line bg-white text-ink text-[10px] font-semibold px-2.5 py-1.5 active:scale-[0.97] transition-transform"
            >
              <Plus className="h-3 w-3" />
              Umum
            </button>
          </div>
        )}
      </div>

      <div>
        {/* Header section — ringkas, count tetap noticeable */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-xs font-semibold text-ink">Semua Pengumuman</h2>
          <span
            className="inline-flex items-center gap-1 rounded-full bg-forest text-white text-[10px] font-bold px-2 py-0.5 tabular-nums"
            title={`${sorted.length} pengumuman`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-lime" />
            {sorted.length}
          </span>
        </div>
        {error ? (
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            message="Gagal memuat pengumuman"
          />
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={<Inbox className="h-6 w-6" />}
            message="Belum ada pengumuman"
          />
        ) : (
          <div className="space-y-1.5">
            {pageItems.map((a) => {
              const brief = briefByAnn.get(a.id)
              const briefPast = Boolean(brief && brief.date < todayKey)
              const isBriefLive = Boolean(brief && !briefPast)

              if (briefPast) {
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() =>
                      setExpanded((p) => ({ ...p, [a.id]: !p[a.id] }))
                    }
                    className="w-full text-left bg-white border border-line shadow-sm rounded-xl px-3 py-2.5 active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 text-[10px] font-semibold text-forest bg-forest/10 rounded-full px-1.5 py-0.5">
                        Brief
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-ink">
                        {briefDisplayTitle(a.title)}
                      </span>
                      <span className="shrink-0 text-[10px] text-ink-soft/65">
                        {timeLabel(a.created_at)}
                      </span>
                    </div>
                    {expanded[a.id] && <WaBody text={a.body} />}
                  </button>
                )
              }

              if (isBriefLive && brief) {
                return (
                  <article
                    key={a.id}
                    className="bg-white border border-line shadow-sm rounded-xl p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h2 className="text-[12px] font-bold text-ink leading-snug">
                          {briefDisplayTitle(a.title)}
                        </h2>
                        <p className="mt-0.5 text-[9px] text-ink-soft/70">
                          {relativeDayLabel(brief.date)}
                          {relativeDayLabel(brief.date) ? " · " : ""}
                          {formatBriefDateLong(brief.date)}
                        </p>
                      </div>
                      {canEdit && (
                        <PinCardToggle
                          pinned={Boolean(a.pinned)}
                          onToggle={() => void togglePin(a)}
                        />
                      )}
                    </div>
                    <WaBody text={a.body} />
                    <div className="mt-2 pt-1.5 border-t border-line/60 flex items-center justify-between gap-2">
                      <p className="text-[9px] text-ink-soft/50 flex items-center gap-1 min-w-0">
                        <Megaphone className="h-2.5 w-2.5 shrink-0" />
                        <span className="truncate">
                          {authorLabel(a.created_by)}
                        </span>
                      </p>
                      {canEdit && (
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEdit(a)}
                            aria-label="Ubah brief"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft active:bg-surface"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(a)}
                            aria-label="Hapus"
                            className="flex h-8 w-8 items-center justify-center rounded-lg text-alert active:bg-alert-bg"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                )
              }

              return (
                <article
                  key={a.id}
                  className="bg-white border border-line shadow-sm rounded-2xl p-3.5"
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-[10px] text-ink-soft/75 pt-1">
                      {timeLabel(a.created_at)}
                    </span>
                    {canEdit && (
                      <PinCardToggle
                        pinned={Boolean(a.pinned)}
                        onToggle={() => void togglePin(a)}
                      />
                    )}
                  </div>
                  <h2 className="text-[13px] font-bold text-ink leading-snug">
                    {a.title}
                  </h2>
                  <WaBody text={a.body} />
                  <div className="mt-2.5 pt-2 border-t border-line/60 flex items-center justify-between">
                    <p className="text-[10px] text-ink-soft/50 flex items-center gap-1 min-w-0">
                      <Megaphone className="h-2.5 w-2.5 shrink-0" />
                      <span className="truncate">
                        {authorLabel(a.created_by)}
                      </span>
                    </p>
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          aria-label="Ubah pengumuman"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft active:bg-surface"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void remove(a)}
                          aria-label="Hapus"
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-alert active:bg-alert-bg"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}

            {pageCount > 1 && (
              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  disabled={safePage <= 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="min-h-9 rounded-full border border-line bg-white px-3 text-[10px] font-semibold text-ink disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <span className="text-[10px] text-ink-soft/70">
                  {safePage + 1} / {pageCount} · max {PAGE_LIMIT} per halaman
                </span>
                <button
                  type="button"
                  disabled={safePage >= pageCount - 1}
                  onClick={() =>
                    setPage((p) => Math.min(pageCount - 1, p + 1))
                  }
                  className="min-h-9 rounded-full border border-line bg-white px-3 text-[10px] font-semibold text-ink disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <InfoBriefForm
        open={briefOpen}
        onClose={closeBriefForm}
        subjects={subjects ?? []}
        students={(students ?? []).filter((s) => s.active !== false)}
        subjectTeachers={subjectTeachers ?? []}
        editBrief={editBrief}
        onSaved={async () => {
          await mutate()
        }}
      />

      <Sheet
        open={open}
        onClose={closeSheet}
        title={editing ? "Ubah Pengumuman" : "Pengumuman Umum"}
        fullHeight
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
            className="min-h-11 w-full rounded-lg border border-forest/40 bg-white px-3 text-[12px] font-medium text-ink focus:outline-none focus:ring-2 focus:ring-forest/25 focus:border-forest"
            placeholder="Jadwal piket…"
          />
        </Field>
        <Field label="Isi">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={16}
            className="min-h-11 w-full resize-none scroll-y-only rounded-xl border border-forest/45 bg-white px-3 py-2.5 text-[12px] text-ink placeholder:text-ink-soft/45 focus:outline-none focus:ring-2 focus:ring-forest/25 focus:border-forest"
            placeholder="Tulis info untuk kelas…"
          />
        </Field>
        <button
          type="button"
          onClick={() => setPinned((v) => !v)}
          aria-pressed={pinned}
          className="w-full flex items-center justify-between rounded-xl border border-line bg-page px-3 py-2.5"
        >
          <span className="text-[11px] font-semibold text-ink">
            Sematkan di Beranda
          </span>
          <span
            className={`h-5 w-9 rounded-full relative transition-colors ${
              pinned ? "bg-lime" : "bg-line"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
                pinned ? "left-[18px] bg-deep" : "left-0.5 bg-white"
              }`}
            />
          </span>
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="flex w-full items-center justify-center gap-1 rounded-full bg-forest px-2.5 py-2.5 text-[12px] font-semibold text-white active:scale-[0.97] transition-transform disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          {saving
            ? "Menyimpan…"
            : editing
              ? "Simpan Perubahan"
              : "Terbitkan"}
        </button>
      </Sheet>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-forest text-white text-[11px] font-semibold px-3 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <div className="h-2" />
    </div>
  )
}
