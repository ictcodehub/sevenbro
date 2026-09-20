"use client"

import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"
import {
  Users,
  Shield,
  Inbox,
  UserPlus,
  Link2,
  GraduationCap,
  Trash2,
  Pencil,
  Check,
  X,
  Clock,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { SectionHeader, EmptyState } from "@/components/ui-primitives"
import { Sheet, inputClass } from "@/components/ui/sheet"
import { formatDisplayName } from "@/lib/format"
import { canProposeRoster, canViewRoster } from "@/lib/policies"

type Student = {
  id: string
  full_name: string
  email: string | null
  nis: string | null
  position: string
  active: boolean
}

type PendingUser = {
  id: string
  email: string
  name: string | null
  role: string
  suggested_student_id?: string | null
  suggested_student_name?: string | null
  match_reason?: string | null
}

type Teacher = {
  id: string
  email: string
  name: string | null
}

type RosterProposal = {
  id: string
  action: "ADD" | "UPDATE" | "DELETE"
  student_id: string | null
  payload: {
    names?: string[]
    studentId?: string
    full_name?: string
    patch?: Record<string, unknown>
  }
  status: "PENDING" | "APPROVED" | "REJECTED"
  proposed_by: string
  proposed_by_name: string | null
  reviewed_by: string | null
  review_note: string | null
  created_at: string
  reviewed_at: string | null
}

const POSITIONS = ["KETUA", "BENDAHARA", "SEKRETARIS", "ANGGOTA"] as const

const POSITION_BADGE: Record<string, "default" | "secondary" | "warning" | "success" | "info"> = {
  KETUA: "default",
  BENDAHARA: "success",
  SEKRETARIS: "info",
  ANGGOTA: "secondary",
}

function positionBadge(position: string) {
  const variant = POSITION_BADGE[position] ?? "secondary"
  return (
    <Badge variant={variant} className="text-[11px] px-1.5 py-0">
      {position}
    </Badge>
  )
}

function describePatch(patch: Record<string, unknown>): string {
  const parts: string[] = []
  if (typeof patch.position === "string") parts.push(`Posisi → ${patch.position}`)
  if (typeof patch.full_name === "string") {
    parts.push(`Nama → ${formatDisplayName(patch.full_name)}`)
  }
  if (typeof patch.email === "string") {
    parts.push(`Email → ${patch.email || "(dikosongkan)"}`)
  }
  if (typeof patch.nis === "string") {
    parts.push(`NIS → ${patch.nis || "(dikosongkan)"}`)
  }
  if (typeof patch.active === "boolean") {
    parts.push(`Status → ${patch.active ? "Aktif" : "Nonaktif"}`)
  }
  return parts.join(" · ")
}

function proposalLines(p: RosterProposal): { title: string; detail: string } {
  if (p.action === "ADD") {
    const names = (p.payload.names ?? []).map((n) => formatDisplayName(n))
    return {
      title: `Tambah ${names.length} siswa`,
      detail: names.join(", ") || "—",
    }
  }
  if (p.action === "UPDATE") {
    const name = formatDisplayName(p.payload.full_name) || "Siswa"
    return {
      title: `Ubah ${name}`,
      detail: describePatch(p.payload.patch ?? {}) || "Perubahan data siswa",
    }
  }
  return {
    title: `Hapus ${formatDisplayName(p.payload.full_name) || "siswa"}`,
    detail: "Dihapus dari roster kelas",
  }
}

function StatusChip({ status }: { status: RosterProposal["status"] }) {
  const label =
    status === "PENDING" ? "Menunggu" : status === "APPROVED" ? "Disetujui" : "Ditolak"
  const cls =
    status === "PENDING"
      ? "bg-amber/15 text-amber-800 border-amber/30"
      : status === "APPROVED"
        ? "bg-ok-bg text-forest border-forest/20"
        : "bg-alert-bg text-alert border-alert/25"
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-full border shrink-0 ${cls}`}
    >
      {status === "PENDING" && <Clock className="h-3 w-3" />}
      {label}
    </span>
  )
}

export default function AdminRosterPage() {
  const { data: session, status } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const isHomeroom = role === "HOMEROOM"
  const isKetua = role === "KETUA"

  const [students, setStudents] = useState<Student[]>([])
  const [pending, setPending] = useState<PendingUser[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [proposals, setProposals] = useState<RosterProposal[]>([])
  const [teacherEmail, setTeacherEmail] = useState("")
  const [teacherName, setTeacherName] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showBulk, setShowBulk] = useState(false)
  const [bulkNames, setBulkNames] = useState("")
  const [saving, setSaving] = useState(false)
  const [linkStudent, setLinkStudent] = useState<Record<string, string>>({})
  const [toast, setToast] = useState<string | null>(null)
  const [editStudent, setEditStudent] = useState<Student | null>(null)
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editNis, setEditNis] = useState("")

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const openEditStudent = (s: Student) => {
    setEditStudent(s)
    setEditTeacher(null)
    setEditName(s.full_name)
    setEditEmail(s.email ?? "")
    setEditNis(s.nis ?? "")
  }

  const openEditTeacher = (t: Teacher) => {
    setEditTeacher(t)
    setEditStudent(null)
    setEditName(t.name ?? "")
    setEditEmail(t.email)
    setEditNis("")
  }

  const closeEdit = () => {
    setEditStudent(null)
    setEditTeacher(null)
    setEditName("")
    setEditEmail("")
    setEditNis("")
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const [sr, pr, tr, rr] = await Promise.all([
        fetch("/api/admin/students", { headers: { Accept: "application/json" } }),
        isHomeroom
          ? fetch("/api/admin/pending-users", { headers: { Accept: "application/json" } })
          : Promise.resolve(null),
        isHomeroom
          ? fetch("/api/admin/teachers", { headers: { Accept: "application/json" } })
          : Promise.resolve(null),
        fetch("/api/admin/roster-proposals", { headers: { Accept: "application/json" } }),
      ])
      const sb = await sr.json().catch(() => null)
      if (!sr.ok) throw new Error(sb?.error || `Gagal (${sr.status})`)
      setStudents(sb as Student[])
      if (pr) {
        const pb = await pr.json().catch(() => null)
        if (pr.ok) {
          const items = Array.isArray(pb)
            ? (pb as PendingUser[])
            : ((pb?.items ?? []) as PendingUser[])
          const autoLinked = Array.isArray(pb?.autoLinked)
            ? (pb.autoLinked as { email: string; student_name: string }[])
            : []
          setPending(items)
          if (autoLinked.length) {
            flash(
              `Auto-match: ${autoLinked
                .map((a) => `${a.email} → ${a.student_name}`)
                .join(", ")}`,
            )
          }
          const sug: Record<string, string> = {}
          for (const p of items) {
            if (p.suggested_student_id) sug[p.id] = p.suggested_student_id
          }
          setLinkStudent((prev) => ({ ...sug, ...prev }))
        }
      }
      if (tr) {
        const tb = await tr.json().catch(() => null)
        if (tr.ok) setTeachers(tb as Teacher[])
      }
      if (rr?.ok) {
        const rb = await rr.json().catch(() => null)
        if (Array.isArray(rb)) setProposals(rb as RosterProposal[])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat roster")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === "authenticated" && canViewRoster(role ?? "")) {
      void load()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, role])

  if (status === "loading") {
    return (
      <div className="px-4 py-3">
        <p className="text-[11px] text-ink-soft/75">Memuat…</p>
      </div>
    )
  }

  if (!canViewRoster(role ?? "")) {
    return (
      <div className="px-4 py-3">
        <EmptyState
          icon={<Shield className="h-6 w-6" />}
          message="Hanya wali kelas & ketua yang boleh membuka roster"
        />
      </div>
    )
  }

  const propose = async (body: Record<string, unknown>, okMsg: string) => {
    setSaving(true)
    try {
      const r = await fetch("/api/admin/roster-proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || `Gagal (${r.status})`)
      flash(okMsg)
      await load()
    } catch (e) {
      flash(e instanceof Error ? e.message : "Gagal mengirim usulan")
    } finally {
      setSaving(false)
    }
  }

  const decideProposal = async (id: string, decision: "APPROVED" | "REJECTED") => {
    try {
      const r = await fetch(`/api/admin/roster-proposals/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || "Gagal")
      flash(decision === "APPROVED" ? "Usulan disetujui & diterapkan" : "Usulan ditolak")
      await load()
    } catch (e) {
      flash(e instanceof Error ? e.message : "Gagal")
    }
  }

  const saveEdit = async () => {
    const name = editName.trim()
    if (!name) {
      flash("Nama tidak boleh kosong")
      return
    }
    setSaving(true)
    try {
      if (editStudent) {
        const payload = {
          full_name: name,
          email: editEmail.trim() || null,
          nis: editNis.trim() || null,
        }
        if (canProposeRoster(role ?? "")) {
          await propose(
            {
              action: "UPDATE",
              studentId: editStudent.id,
              label: editStudent.full_name,
              full_name: name,
              email: editEmail.trim() || null,
              nis: editNis.trim() || null,
            },
            "Usulan ubah data dikirim ke wali kelas",
          )
        } else {
          const r = await fetch(`/api/admin/students/${editStudent.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
          const b = await r.json().catch(() => null)
          if (!r.ok) throw new Error(b?.error || "Gagal menyimpan siswa")
          setStudents((prev) =>
            prev.map((s) => (s.id === editStudent.id ? { ...s, ...payload, nis: payload.nis } : s)),
          )
          flash("Data siswa diperbarui")
        }
      } else if (editTeacher) {
        const r = await fetch(`/api/admin/teachers/${editTeacher.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email: editEmail.trim().toLowerCase(),
          }),
        })
        const b = await r.json().catch(() => null)
        if (!r.ok) throw new Error(b?.error || "Gagal menyimpan guru")
        setTeachers((prev) =>
          prev.map((t) =>
            t.id === editTeacher.id
              ? { ...t, name, email: editEmail.trim().toLowerCase() }
              : t,
          ),
        )
        flash("Data guru diperbarui")
      }
      closeEdit()
    } catch (e) {
      flash(e instanceof Error ? e.message : "Gagal")
    } finally {
      setSaving(false)
    }
  }

  const bulkSubmit = async () => {
    const names = bulkNames
      .split("\n")
      .map((n) => n.trim())
      .filter(Boolean)
    if (names.length === 0) return
    if (canProposeRoster(role ?? "")) {
      await propose({ action: "ADD", names }, "Usulan tambah siswa dikirim ke wali kelas")
      setBulkNames("")
      setShowBulk(false)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const r = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ names }),
      })
      const body = await r.json().catch(() => null)
      if (!r.ok) throw new Error(body?.error || `Gagal (${r.status})`)
      setBulkNames("")
      setShowBulk(false)
      flash("Siswa ditambahkan")
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menambah siswa")
    } finally {
      setSaving(false)
    }
  }

  const updatePosition = async (s: Student, position: string) => {
    if (canProposeRoster(role ?? "")) {
      await propose(
        { action: "UPDATE", studentId: s.id, label: s.full_name, position },
        "Usulan ubah posisi dikirim ke wali kelas",
      )
      return
    }
    try {
      const r = await fetch(`/api/admin/students/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position }),
      })
      if (!r.ok) {
        const b = await r.json().catch(() => null)
        throw new Error(b?.error || "Gagal")
      }
      setStudents((prev) => prev.map((x) => (x.id === s.id ? { ...x, position } : x)))
      flash("Posisi diperbarui")
    } catch (e) {
      flash(e instanceof Error ? e.message : "Gagal")
    }
  }

  const toggleActive = async (s: Student) => {
    if (canProposeRoster(role ?? "")) {
      await propose(
        { action: "UPDATE", studentId: s.id, label: s.full_name, active: !s.active },
        "Usulan ubah status dikirim ke wali kelas",
      )
      return
    }
    try {
      const r = await fetch(`/api/admin/students/${s.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !s.active }),
      })
      if (!r.ok) {
        const b = await r.json().catch(() => null)
        throw new Error(b?.error || "Gagal")
      }
      setStudents((prev) =>
        prev.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)),
      )
      flash(s.active ? "Dinonaktifkan" : "Diaktifkan")
    } catch (e) {
      flash(e instanceof Error ? e.message : "Gagal")
    }
  }

  const removeStudent = async (s: Student) => {
    if (!confirm(`Usulkan hapus ${formatDisplayName(s.full_name)}?`)) return
    if (canProposeRoster(role ?? "")) {
      await propose(
        { action: "DELETE", studentId: s.id, label: s.full_name },
        "Usulan hapus siswa dikirim ke wali kelas",
      )
      return
    }
    if (!confirm("Hapus siswa ini dari roster?")) return
    try {
      const r = await fetch(`/api/admin/students/${s.id}`, { method: "DELETE" })
      if (!r.ok) {
        const b = await r.json().catch(() => null)
        throw new Error(b?.error || "Gagal")
      }
      setStudents((prev) => prev.filter((x) => x.id !== s.id))
      flash("Siswa dihapus")
    } catch (e) {
      flash(e instanceof Error ? e.message : "Gagal")
    }
  }

  const linkAccount = async (userId: string) => {
    const studentId = linkStudent[userId]
    if (!studentId) {
      flash("Pilih siswa dulu")
      return
    }
    try {
      const r = await fetch(`/api/admin/pending-users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || "Gagal menautkan")
      flash("Akun tertaut — siswa bisa masuk")
      await load()
    } catch (e) {
      flash(e instanceof Error ? e.message : "Gagal")
    }
  }

  const addTeacher = async () => {
    const email = teacherEmail.trim().toLowerCase()
    if (!email) {
      flash("Email wajib diisi")
      return
    }
    setSaving(true)
    try {
      const r = await fetch("/api/admin/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name: teacherName.trim() || null }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || "Gagal menambah guru")
      setTeacherEmail("")
      setTeacherName("")
      flash("Guru berhasil ditambahkan. Dapat memindai QR.")
      await load()
    } catch (e) {
      flash(e instanceof Error ? e.message : "Gagal")
    } finally {
      setSaving(false)
    }
  }

  const removeTeacher = async (id: string) => {
    if (!confirm("Hapus izin guru ini?")) return
    try {
      const r = await fetch(`/api/admin/teachers/${id}`, { method: "DELETE" })
      if (!r.ok) {
        const b = await r.json().catch(() => null)
        throw new Error(b?.error || "Gagal")
      }
      setTeachers((prev) => prev.filter((t) => t.id !== id))
      flash("Guru dihapus")
    } catch (e) {
      flash(e instanceof Error ? e.message : "Gagal")
    }
  }

  const pendingProposals = proposals.filter((p) => p.status === "PENDING")
  const myProposals = proposals.filter((p) => p.status !== "PENDING" || isKetua)

  return (
    <div className="px-4 py-3 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-ink">Roster Kelas</h1>
          <p className="text-[11px] text-ink-soft/75">
            {isKetua
              ? "Usul perubahan — menunggu persetujuan wali kelas"
              : "Siswa, guru & tautan akun"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowBulk((v) => !v)}
          className="flex items-center gap-1 bg-forest text-white text-sm font-semibold px-3 py-1.5 rounded-xl active:scale-[0.97] transition-transform"
        >
          <UserPlus className="h-3.5 w-3.5" />
          {isKetua ? "Usul Tambah" : "Tambah"}
        </button>
      </div>

      {showBulk && (
        <div className="bg-white border border-line shadow-sm rounded-2xl p-3 space-y-2">
          <p className="text-[11px] font-semibold text-ink">
            {isKetua ? "Usul tambah siswa (satu nama per baris)" : "Satu nama per baris"}
          </p>
          <textarea
            value={bulkNames}
            onChange={(e) => setBulkNames(e.target.value)}
            rows={5}
            placeholder={"Nama siswa 1\nNama siswa 2"}
            className="w-full text-[11px] border border-line rounded-xl p-2 bg-page text-ink resize-none scroll-y-only"
          />
          <button
            type="button"
            disabled={saving || !bulkNames.trim()}
            onClick={() => void bulkSubmit()}
            className="w-full bg-forest text-white text-[11px] font-semibold py-2 rounded-xl disabled:opacity-50"
          >
            {saving ? "Mengirim…" : isKetua ? "Kirim Usulan" : "Simpan"}
          </button>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-alert bg-alert-bg border border-alert/20 rounded-xl px-3 py-2">
          {error}
        </p>
      )}

      {/* Homeroom: review usulan Ketua */}
      {isHomeroom && pendingProposals.length > 0 && (
        <div>
          <SectionHeader
            title="Usulan Ketua"
            count={String(pendingProposals.length)}
          />
          <div className="space-y-2">
            {pendingProposals.map((p) => {
              const { title, detail } = proposalLines(p)
              return (
                <div
                  key={p.id}
                  className="bg-white border border-line shadow-sm rounded-2xl p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-ink truncate">{title}</p>
                      <p className="text-xs text-ink-soft/70 mt-0.5 truncate">{detail}</p>
                      <p className="text-[11px] text-ink-soft/55 mt-1">
                        Diusulkan {formatDisplayName(p.proposed_by_name) || p.proposed_by}
                        {" · "}
                        {new Date(p.created_at).toLocaleDateString("id-ID")}
                      </p>
                    </div>
                    <StatusChip status="PENDING" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => void decideProposal(p.id, "APPROVED")}
                      className="flex-1 flex items-center justify-center gap-1 bg-forest text-white text-[11px] font-semibold py-2 rounded-xl"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Setujui
                    </button>
                    <button
                      type="button"
                      onClick={() => void decideProposal(p.id, "REJECTED")}
                      className="flex-1 flex items-center justify-center gap-1 bg-alert-bg text-alert border border-alert/25 text-[11px] font-semibold py-2 rounded-xl"
                    >
                      <X className="h-3.5 w-3.5" />
                      Tolak
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Guru — Homeroom only */}
      {isHomeroom && (
        <div>
          <SectionHeader title="Guru (Scan Beri Poin)" count={String(teachers.length)} />
          <div className="bg-white border border-line shadow-sm rounded-2xl p-3 space-y-2 mb-2">
            <div className="flex gap-2">
              <input
                value={teacherEmail}
                onChange={(e) => setTeacherEmail(e.target.value)}
                placeholder="guru@mutiarabangsa.sch.id"
                className={inputClass + " flex-1"}
                type="email"
              />
            </div>
            <input
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="Nama (opsional)"
              className={inputClass}
            />
            <button
              type="button"
              disabled={saving || !teacherEmail.trim()}
              onClick={() => void addTeacher()}
              className="w-full bg-forest text-white text-[11px] font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              {saving ? "Menyimpan…" : "Daftarkan guru"}
            </button>
          </div>
          {teachers.length === 0 ? (
            <EmptyState
              icon={<GraduationCap className="h-6 w-6" />}
              message="Belum ada guru — daftarkan email sekolah"
            />
          ) : (
            <div className="bg-white border border-line shadow-sm rounded-2xl divide-y divide-line/60">
              {teachers.map((t) => (
                <div key={t.id} className="p-2.5 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber/15 shrink-0">
                    <GraduationCap className="h-3.5 w-3.5 text-amber" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-ink truncate">
                      {formatDisplayName(t.name) || t.email}
                    </p>
                    <p className="text-xs text-ink-soft/70 truncate">{t.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditTeacher(t)}
                    aria-label="Ubah data guru"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft hover:bg-surface shrink-0"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeTeacher(t.id)}
                    aria-label="Hapus guru"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-alert hover:bg-alert-bg shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {isHomeroom && pending.length > 0 && (
        <div>
          <SectionHeader title="Akun menunggu" count={String(pending.length)} />
          <div className="space-y-2">
            {pending.map((u) => (
              <div
                key={u.id}
                className="bg-white border border-line shadow-sm rounded-2xl p-3 space-y-2"
              >
                <p className="text-[11px] font-semibold text-ink truncate">
                  {formatDisplayName(u.name) || u.email}
                </p>
                <p className="text-xs text-ink-soft/70 truncate">{u.email}</p>
                {u.suggested_student_name && (
                  <p className="text-xs text-amber font-medium">
                    Saran tautan: {u.suggested_student_name}
                    {u.match_reason === "marga-mirip" && " (nama depan beda)"}
                    {" — konfirmasi manual"}
                  </p>
                )}
                <div className="flex gap-2">
                  <select
                    value={linkStudent[u.id] ?? ""}
                    onChange={(e) =>
                      setLinkStudent((prev) => ({ ...prev, [u.id]: e.target.value }))
                    }
                    className={inputClass + " flex-1"}
                  >
                    <option value="">Tautkan ke siswa…</option>
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {formatDisplayName(s.full_name)}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => void linkAccount(u.id)}
                    className="flex items-center gap-1 bg-forest text-white text-sm font-semibold px-3 rounded-xl shrink-0"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    Tautkan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionHeader
          title={isKetua ? "Daftar siswa" : "Daftar siswa"}
          count={String(students.length)}
        />
        {loading ? (
          <EmptyState icon={<Users className="h-6 w-6" />} message="Memuat roster…" />
        ) : students.length === 0 ? (
          <EmptyState icon={<Inbox className="h-6 w-6" />} message="Belum ada siswa" />
        ) : (
          <div className="bg-white border border-line shadow-sm rounded-2xl divide-y divide-line/60">
            {students.map((s) => (
              <div key={s.id} className="p-2.5 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface shrink-0">
                  <Users className="h-3.5 w-3.5 text-forest" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-[11px] font-semibold text-ink truncate">
                    {formatDisplayName(s.full_name)}
                  </p>
                  <p className="text-xs text-ink-soft/75 truncate">
                    {s.email || "belum terhubung"}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={s.position}
                      onChange={(e) => void updatePosition(s, e.target.value)}
                      className="text-xs border border-line rounded-lg bg-page px-1.5 py-0.5 text-ink"
                    >
                      {POSITIONS.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => void toggleActive(s)}
                      className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full border ${
                        s.active
                          ? "bg-ok-bg text-forest border-forest/20"
                          : "bg-alert-bg text-alert border-alert/20"
                      }`}
                    >
                      {s.active ? "Aktif" : "Nonaktif"}
                    </button>
                  </div>
                </div>
                {positionBadge(s.position)}
                <button
                  type="button"
                  onClick={() => openEditStudent(s)}
                  aria-label="Ubah data siswa"
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft hover:bg-surface shrink-0"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void removeStudent(s)}
                  aria-label={isKetua ? "Usul hapus siswa" : "Hapus siswa"}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-alert hover:bg-alert-bg shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Riwayat / status usulan */}
      {proposals.length > 0 && (
        <div>
          <SectionHeader
            title={isKetua ? "Usulan saya" : "Riwayat usulan"}
            count={String(isKetua ? proposals.length : proposals.length - pendingProposals.length)}
          />
          <div className="space-y-1.5">
            {proposals
              .filter((p) => (isKetua ? true : p.status !== "PENDING"))
              .slice(0, 20)
              .map((p) => {
                const { title, detail } = proposalLines(p)
                return (
                  <div
                    key={p.id}
                    className="bg-white border border-line shadow-sm rounded-xl px-3 py-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-ink truncate">{title}</p>
                        <p className="text-xs text-ink-soft/70 mt-0.5 truncate">{detail}</p>
                        <p className="text-[11px] text-ink-soft/50 mt-1">
                          {new Date(p.created_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          {isHomeroom && p.reviewed_at
                            ? ` · diulas ${new Date(p.reviewed_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`
                            : ""}
                        </p>
                      </div>
                      <StatusChip status={p.status} />
                    </div>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-forest text-white text-[11px] font-semibold px-3 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      <Sheet
        open={Boolean(editStudent || editTeacher)}
        onClose={closeEdit}
        title={editStudent ? "Ubah Data Siswa" : "Ubah Data Guru"}
      >
        <div className="space-y-2">
          <div>
            <span className="text-[11px] font-semibold text-ink">Nama Lengkap</span>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={inputClass + " mt-1"}
              placeholder="Nama lengkap"
            />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-ink">Email</span>
            <input
              value={editEmail}
              onChange={(e) => setEditEmail(e.target.value)}
              type="email"
              className={inputClass + " mt-1"}
              placeholder="nama@mutiarabangsa.sch.id"
            />
          </div>
          {editStudent && (
            <div>
              <span className="text-[11px] font-semibold text-ink">NIS</span>
              <input
                value={editNis}
                onChange={(e) => setEditNis(e.target.value)}
                className={inputClass + " mt-1"}
                placeholder="Nomor Induk Siswa (opsional)"
              />
            </div>
          )}
          {isKetua && editStudent && (
            <p className="text-xs text-ink-soft/70 bg-amber/10 border border-amber/20 rounded-xl px-2.5 py-2">
              Perubahan dikirim sebagai usulan. Wali kelas harus menyetujui sebelum diterapkan.
            </p>
          )}
          <button
            type="button"
            disabled={saving || !editName.trim()}
            onClick={() => void saveEdit()}
            className="w-full bg-forest text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {saving ? "Menyimpan…" : isKetua ? "Kirim Usulan" : "Simpan Perubahan"}
          </button>
        </div>
      </Sheet>

      <div className="h-2" />
    </div>
  )
}
