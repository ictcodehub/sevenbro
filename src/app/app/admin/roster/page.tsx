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
import { useT } from "@/lib/i18n"

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

type AllowlistRow = {
  id: string
  email: string
  note: string | null
  created_by: string | null
  created_at: string
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
  const [allowlist, setAllowlist] = useState<AllowlistRow[]>([])
  const [allowEmail, setAllowEmail] = useState("")
  const [allowNote, setAllowNote] = useState("")
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
  const t = useT()

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
      const [sr, pr, tr, rr, ar] = await Promise.all([
        fetch("/api/admin/students", { headers: { Accept: "application/json" } }),
        isHomeroom
          ? fetch("/api/admin/pending-users", { headers: { Accept: "application/json" } })
          : Promise.resolve(null),
        isHomeroom
          ? fetch("/api/admin/teachers", { headers: { Accept: "application/json" } })
          : Promise.resolve(null),
        fetch("/api/admin/roster-proposals", { headers: { Accept: "application/json" } }),
        isHomeroom
          ? fetch("/api/admin/login-allowlist", { headers: { Accept: "application/json" } })
          : Promise.resolve(null),
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
              t("roster.autoMatch", {
                list: autoLinked.map((a) => `${a.email} → ${a.student_name}`).join(", "),
              }),
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
      if (ar?.ok) {
        const ab = await ar.json().catch(() => null)
        if (Array.isArray(ab)) setAllowlist(ab as AllowlistRow[])
      }
      if (rr?.ok) {
        const rb = await rr.json().catch(() => null)
        if (Array.isArray(rb)) setProposals(rb as RosterProposal[])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("roster.loadFailed"))
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
          <p className="text-[11px] text-ink-soft/75">{t("common.loading")}</p>
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
      if (!r.ok) throw new Error(b?.error || t("common.failedWithStatus", { status: r.status }))
      flash(okMsg)
      await load()
    } catch (e) {
      flash(e instanceof Error ? e.message : t("roster.proposalFailed"))
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
      if (!r.ok) throw new Error(b?.error || t("common.failed"))
      flash(t(decision === "APPROVED" ? "roster.proposalApproved" : "roster.proposalRejected"))
      await load()
    } catch (e) {
      flash(e instanceof Error ? e.message : t("common.failed"))
    }
  }

  const saveEdit = async () => {
    const name = editName.trim()
    if (!name) {
      flash(t("roster.nameRequired"))
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
            t("roster.proposeUpdateSent"),
          )
        } else {
          const r = await fetch(`/api/admin/students/${editStudent.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
          const b = await r.json().catch(() => null)
          if (!r.ok) throw new Error(b?.error || t("roster.saveStudentFailed"))
          setStudents((prev) =>
            prev.map((s) => (s.id === editStudent.id ? { ...s, ...payload, nis: payload.nis } : s)),
          )
          flash(t("roster.studentUpdated"))
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
          if (!r.ok) throw new Error(b?.error || t("roster.saveTeacherFailed"))
        setTeachers((prev) =>
          prev.map((t) =>
            t.id === editTeacher.id
              ? { ...t, name, email: editEmail.trim().toLowerCase() }
              : t,
          ),
        )
        flash(t("roster.teacherUpdated"))
      }
      closeEdit()
    } catch (e) {
      flash(e instanceof Error ? e.message : t("common.failed"))
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
      await propose({ action: "ADD", names }, t("roster.proposeAddSent"))
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
      if (!r.ok) throw new Error(body?.error || t("common.failedWithStatus", { status: r.status }))
      setBulkNames("")
      setShowBulk(false)
      flash(t("roster.studentAdded"))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : t("roster.addStudentFailed"))
    } finally {
      setSaving(false)
    }
  }

  const updatePosition = async (s: Student, position: string) => {
    if (canProposeRoster(role ?? "")) {
      await propose(
        { action: "UPDATE", studentId: s.id, label: s.full_name, position },
        t("roster.proposePositionSent"),
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
        throw new Error(b?.error || t("common.failed"))
      }
      setStudents((prev) => prev.map((x) => (x.id === s.id ? { ...x, position } : x)))
      flash(t("roster.positionUpdated"))
    } catch (e) {
      flash(e instanceof Error ? e.message : t("common.failed"))
    }
  }

  const toggleActive = async (s: Student) => {
    if (canProposeRoster(role ?? "")) {
      await propose(
        { action: "UPDATE", studentId: s.id, label: s.full_name, active: !s.active },
        t("roster.proposeStatusSent"),
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
        throw new Error(b?.error || t("common.failed"))
      }
      setStudents((prev) =>
        prev.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)),
      )
      flash(t(s.active ? "roster.deactivated" : "roster.activated"))
    } catch (e) {
      flash(e instanceof Error ? e.message : t("common.failed"))
    }
  }

  const removeStudent = async (s: Student) => {
    if (!confirm(t("roster.proposeDelete", { name: formatDisplayName(s.full_name) }))) return
    if (canProposeRoster(role ?? "")) {
      await propose(
        { action: "DELETE", studentId: s.id, label: s.full_name },
        t("roster.proposeDeleteSent"),
      )
      return
    }
    if (!confirm(t("roster.deleteStudentConfirm"))) return
    try {
      const r = await fetch(`/api/admin/students/${s.id}`, { method: "DELETE" })
      if (!r.ok) {
        const b = await r.json().catch(() => null)
        throw new Error(b?.error || t("common.failed"))
      }
      setStudents((prev) => prev.filter((x) => x.id !== s.id))
      flash(t("roster.studentDeleted"))
    } catch (e) {
      flash(e instanceof Error ? e.message : t("common.failed"))
    }
  }

  const linkAccount = async (userId: string) => {
    const studentId = linkStudent[userId]
    if (!studentId) {
      flash(t("roster.pickFirst"))
      return
    }
    try {
      const r = await fetch(`/api/admin/pending-users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || t("roster.linkFailed"))
      flash(t("roster.accountLinked"))
      await load()
    } catch (e) {
      flash(e instanceof Error ? e.message : t("common.failed"))
    }
  }

  const addTeacher = async () => {
    const email = teacherEmail.trim().toLowerCase()
    if (!email) {
      flash(t("roster.emailRequired"))
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
      if (!r.ok) throw new Error(b?.error || t("roster.addTeacherFailed"))
      setTeacherEmail("")
      setTeacherName("")
      flash(t("roster.teacherAddedQR"))
      await load()
    } catch (e) {
      flash(e instanceof Error ? e.message : t("common.failed"))
    } finally {
      setSaving(false)
    }
  }

  const removeTeacher = async (id: string) => {
    if (!confirm(t("roster.deleteTeacherConfirm"))) return
    try {
      const r = await fetch(`/api/admin/teachers/${id}`, { method: "DELETE" })
      if (!r.ok) {
        const b = await r.json().catch(() => null)
        throw new Error(b?.error || t("common.failed"))
      }
      setTeachers((prev) => prev.filter((t) => t.id !== id))
      flash(t("roster.teacherDeleted"))
    } catch (e) {
      flash(e instanceof Error ? e.message : t("common.failed"))
    }
  }

  const addAllowlist = async () => {
    const email = allowEmail.trim().toLowerCase()
    if (!email) {
      flash(t("roster.emailRequired"))
      return
    }
    setSaving(true)
    try {
      const r = await fetch("/api/admin/login-allowlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, note: allowNote.trim() || null }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || t("roster.allowlistAddFailed"))
      setAllowEmail("")
      setAllowNote("")
      flash(t("roster.allowlistAdded"))
      await load()
    } catch (e) {
      flash(e instanceof Error ? e.message : t("common.failed"))
    } finally {
      setSaving(false)
    }
  }

  const removeAllowlist = async (id: string) => {
    try {
      const r = await fetch(`/api/admin/login-allowlist?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      })
      if (!r.ok) {
        const b = await r.json().catch(() => null)
        throw new Error(b?.error || t("common.failed"))
      }
      setAllowlist((prev) => prev.filter((x) => x.id !== id))
      flash(t("roster.allowlistDeleted"))
    } catch (e) {
      flash(e instanceof Error ? e.message : t("common.failed"))
    }
  }

  const pendingProposals = proposals.filter((p) => p.status === "PENDING")
  const myProposals = proposals.filter((p) => p.status !== "PENDING" || isKetua)

  return (
    <div className="px-4 py-3 space-y-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-ink">{t("roster.title")}</h1>
          <p className="text-[11px] text-ink-soft/75">
            {isKetua ? t("roster.hintPropose") : t("roster.hintManage")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowBulk((v) => !v)}
          className="flex items-center gap-1 bg-forest text-white text-sm font-semibold px-3 py-1.5 rounded-xl active:scale-[0.97] transition-transform"
        >
          <UserPlus className="h-3.5 w-3.5" />
          {isKetua ? t("roster.addPropose") : t("agenda.add")}
        </button>
      </div>

      {showBulk && (
        <div className="bg-white border border-line shadow-sm rounded-2xl p-3 space-y-2">
          <p className="text-[11px] font-semibold text-ink">
            {isKetua ? t("roster.bulkHintPropose") : t("roster.bulkHint")}
          </p>
          <textarea
            value={bulkNames}
            onChange={(e) => setBulkNames(e.target.value)}
            rows={5}
            placeholder={t("roster.bulkPlaceholder")}
            className="w-full text-[11px] border border-line rounded-xl p-2 bg-page text-ink resize-none scroll-y-only"
          />
          <button
            type="button"
            disabled={saving || !bulkNames.trim()}
            onClick={() => void bulkSubmit()}
            className="w-full bg-forest text-white text-[11px] font-semibold py-2 rounded-xl disabled:opacity-50"
          >
            {saving ? t("roster.sending") : isKetua ? t("roster.sendProposal") : t("common.save")}
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
            title={t("roster.proposalsTitle")}
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
                        {t("roster.proposedBy", { name: formatDisplayName(p.proposed_by_name) || p.proposed_by })}
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
                      {t("roster.approve")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void decideProposal(p.id, "REJECTED")}
                      className="flex-1 flex items-center justify-center gap-1 bg-alert-bg text-alert border border-alert/25 text-[11px] font-semibold py-2 rounded-xl"
                    >
                      <X className="h-3.5 w-3.5" />
                      {t("roster.reject")}
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
          <SectionHeader title={t("roster.teachersTitle")} count={String(teachers.length)} />
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
              placeholder={t("roster.teacherNamePlaceholder")}
              className={inputClass}
            />
            <button
              type="button"
              disabled={saving || !teacherEmail.trim()}
              onClick={() => void addTeacher()}
              className="w-full bg-forest text-white text-[11px] font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              {saving ? t("kas.saving") : t("roster.registerTeacher")}
            </button>
          </div>
          {teachers.length === 0 ? (
            <EmptyState
              icon={<GraduationCap className="h-6 w-6" />}
              message={t("roster.noTeachers")}
            />
          ) : (
            <div className="bg-white border border-line shadow-sm rounded-2xl divide-y divide-line/60">
              {teachers.map((tc) => (
                <div key={tc.id} className="p-2.5 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber/15 shrink-0">
                    <GraduationCap className="h-3.5 w-3.5 text-amber" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-ink truncate">
                      {formatDisplayName(tc.name) || tc.email}
                    </p>
                    <p className="text-xs text-ink-soft/70 truncate">{tc.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditTeacher(tc)}
                    aria-label={t("roster.editTeacherAria")}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft hover:bg-surface shrink-0"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeTeacher(tc.id)}
                    aria-label={t("roster.deleteTeacherAria")}
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

      {/* Whitelist login — Homeroom only */}
      {isHomeroom && (
        <div>
          <SectionHeader
            title={t("roster.allowlistTitle")}
            count={String(allowlist.length)}
          />
          <div className="bg-white border border-line shadow-sm rounded-2xl p-3 space-y-2 mb-2">
            <p className="text-xs text-ink-soft/70 leading-snug">{t("roster.allowlistHint")}</p>
            <input
              value={allowEmail}
              onChange={(e) => setAllowEmail(e.target.value)}
              placeholder="guru.mapel@mutiarabangsa.sch.id"
              className={inputClass}
              type="email"
            />
            <input
              value={allowNote}
              onChange={(e) => setAllowNote(e.target.value)}
              placeholder={t("roster.allowlistNote")}
              className={inputClass}
            />
            <button
              type="button"
              disabled={saving || !allowEmail.trim()}
              onClick={() => void addAllowlist()}
              className="w-full bg-forest text-white text-[11px] font-semibold py-2 rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Shield className="h-3.5 w-3.5" />
              {saving ? t("kas.saving") : t("roster.allowlistAdd")}
            </button>
          </div>
          {allowlist.length === 0 ? (
            <EmptyState
              icon={<Shield className="h-6 w-6" />}
              message={t("roster.allowlistEmpty")}
            />
          ) : (
            <div className="bg-white border border-line shadow-sm rounded-2xl divide-y divide-line/60">
              {allowlist.map((row) => (
                <div key={row.id} className="p-2.5 flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-forest/10 shrink-0">
                    <Shield className="h-3.5 w-3.5 text-forest" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-ink truncate">{row.email}</p>
                    {row.note && (
                      <p className="text-xs text-ink-soft/70 truncate">{row.note}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => void removeAllowlist(row.id)}
                    aria-label={t("roster.allowlistDeleteAria")}
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
          <SectionHeader title={t("roster.pendingTitle")} count={String(pending.length)} />
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
                    {t("roster.linkSuggestion", { name: u.suggested_student_name })}
                    {u.match_reason === "marga-mirip" && ` ${t("roster.nameDiff")}`}
                    {` ${t("roster.confirmManual")}`}
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
                    <option value="">{t("roster.linkToStudent")}</option>
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
                    {t("roster.link")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionHeader
          title={t("roster.studentList")}
          count={String(students.length)}
        />
        {loading ? (
          <EmptyState icon={<Users className="h-6 w-6" />} message={t("roster.loading")} />
        ) : students.length === 0 ? (
          <EmptyState icon={<Inbox className="h-6 w-6" />} message={t("roster.noStudents")} />
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
                    {s.email || t("roster.notLinked")}
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
                      {s.active ? t("roster.active") : t("roster.inactive")}
                    </button>
                  </div>
                </div>
                {positionBadge(s.position)}
                <button
                  type="button"
                  onClick={() => openEditStudent(s)}
                  aria-label={t("roster.editStudentAria")}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-soft hover:bg-surface shrink-0"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => void removeStudent(s)}
                  aria-label={isKetua ? t("roster.deleteStudentAriaPropose") : t("roster.deleteStudentAria")}
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
            title={isKetua ? t("roster.myProposals") : t("roster.proposalHistory")}
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
                            ? t("roster.reviewed", { date: new Date(p.reviewed_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) })
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
        title={editStudent ? t("roster.editStudentTitle") : t("roster.editTeacherTitle")}
      >
        <div className="space-y-2">
          <div>
            <span className="text-[11px] font-semibold text-ink">{t("roster.fullName")}</span>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={inputClass + " mt-1"}
              placeholder={t("roster.fullNamePlaceholder")}
            />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-ink">{t("roster.emailLabel")}</span>
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
            <span className="text-[11px] font-semibold text-ink">{t("roster.nisLabel")}</span>
            <input
              value={editNis}
              onChange={(e) => setEditNis(e.target.value)}
              className={inputClass + " mt-1"}
              placeholder={t("roster.nisPlaceholder")}
            />
            </div>
          )}
          {isKetua && editStudent && (
            <p className="text-xs text-ink-soft/70 bg-amber/10 border border-amber/20 rounded-xl px-2.5 py-2">
              {t("roster.proposeNote")}
            </p>
          )}
          <button
            type="button"
            disabled={saving || !editName.trim()}
            onClick={() => void saveEdit()}
            className="w-full bg-forest text-white text-sm font-semibold py-2.5 rounded-xl disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {saving ? t("kas.saving") : isKetua ? t("roster.sendProposal") : t("info.saveChanges")}
          </button>
        </div>
      </Sheet>

      <div className="h-2" />
    </div>
  )
}
