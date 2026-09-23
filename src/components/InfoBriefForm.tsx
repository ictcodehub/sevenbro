"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Copy, Check, X, Pencil } from "lucide-react"
import { Sheet, Field } from "@/components/ui/sheet"
import {
  autoTugasGroupsForDate,
  audienceAllowsStudentPick,
  greetingForBrief,
  defaultBriefDateKey,
  briefTitleForDate,
  formatBriefDateLong,
  generateBriefBody,
  isSchoolDay,
  normalizeAudience,
  fixDutyName,
  piketNamesForDate,
  relativeDayLabel,
  scheduleSubjectsForDate,
  subjectChipsForDate,
  subjectTeacherLookup,
  teacherFromMap,
  uniformForDate,
  type BriefAudience,
  type BriefItemGroup,
  type BriefItemKind,
  type BriefPayload,
  type SubjectRow,
  type SubjectTeacherRow,
} from "@/lib/info-brief"
import { formatDisplayName } from "@/lib/format"
import { useT } from "@/lib/i18n"
import { StudentMultiSelect, type StudentLite } from "@/components/StudentSelect"

type FormSubject = {
  subject_id: string | null
  name: string
  short_name: string | null
  jp: number
  time?: string | null
  session?: number | null
  teacher?: string | null
}
type FormDuty = { student_id: string; name: string }
type FormItem = {
  kind: BriefItemKind
  text: string
  subject_id: string | null
  subject_name: string | null
  audience: BriefAudience
  student_ids: string[]
  student_names: string[]
  event_title: string
  group: BriefItemGroup
}

function toFormSubjects(
  list: {
    subject_id: string | null
    name: string
    short_name?: string | null
    jp: number
    time?: string | null
    session?: number | null
    teacher?: string | null
  }[],
): FormSubject[] {
  return list.map((s) => ({
    subject_id: s.subject_id,
    name: s.name,
    short_name: s.short_name ?? null,
    jp: s.jp,
    time: s.time ?? null,
    session: s.session ?? null,
    teacher: s.teacher ?? null,
  }))
}

/** SSOT field form section — docs/DESIGN_SYSTEM.md § Form row pattern */
const FIELD_SELECT =
  "min-h-11 w-full rounded-lg border border-forest/40 bg-white px-3 text-sm font-medium text-ink focus:outline-none focus:ring-2 focus:ring-forest/25 focus:border-forest"
const FIELD_OPTIONAL =
  "min-h-11 w-full rounded-xl border border-forest/45 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-ink-soft/45 focus:outline-none focus:ring-2 focus:ring-forest/25 focus:border-forest"
const ROW_DELETE =
  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft/80 active:bg-alert/10 active:text-alert"
const ROW_ADD =
  "w-full rounded-xl border border-dashed border-line bg-white px-3 py-2 text-xs font-semibold text-ink-soft"
/** Primary pill — SSOT: Brief Harian / Salin teks WA */
const PILL_PRIMARY =
  "flex items-center gap-1 rounded-full bg-forest text-white text-sm font-semibold px-3 py-1.5 active:scale-[0.97] transition-transform"
/** Secondary pill — SSOT: Umum / Ganti manual */
const PILL_SECONDARY =
  "flex items-center gap-1 rounded-full border border-line bg-white text-ink text-sm font-semibold px-3 py-1.5 active:scale-[0.97] transition-transform"
/** Link aksi sekunder — tanpa background */
const TEXT_ACTION =
  "min-h-9 shrink-0 px-1 text-xs font-semibold text-forest active:opacity-70"

function SectionLabel({
  children,
  action,
}: {
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm font-semibold text-ink">{children}</span>
      {action}
    </div>
  )
}

function BriefSectionCard({
  title,
  subtitle,
  action,
  children,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-line bg-white shadow-sm">
      <div className="flex items-start justify-between gap-2 border-b border-line bg-page px-3 py-2.5 rounded-t-2xl">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">{title}</p>
          {subtitle && (
            <p className="text-xs text-ink-soft/70 leading-snug mt-0.5">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="p-3 space-y-2.5">{children}</div>
    </div>
  )
}

/** Alias token form — sama dengan FIELD_SELECT (tanpa aksen amber) */
const actionFieldClass = FIELD_SELECT

/** Field teks opsional — SSOT deskripsi (label + dotted token line) */
function OptionalTextField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder?: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <label className="block space-y-1 min-w-0">
      <span className="block text-xs font-medium text-ink-soft">
        {label}
        <span className="ml-1 font-normal text-ink-soft/55">opsional</span>
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={FIELD_OPTIONAL}
      />
    </label>
  )
}

function makeTugasItem(subject_name: string | null): FormItem {
  return {
    kind: "TASK",
    text: "",
    subject_id: null,
    subject_name,
    audience: "ALL",
    student_ids: [],
    student_names: [],
    event_title: "",
    group: "tugas",
  }
}

function makeSimpleItem(text: string, group: BriefItemGroup): FormItem {
  return {
    kind: group === "remedial" ? "TASK" : group === "info" ? "BRING" : "TASK",
    text,
    subject_id: null,
    subject_name: null,
    audience: group === "remedial" ? "REMEDIAL" : "ALL",
    student_ids: [],
    student_names: [],
    event_title: "",
    group,
  }
}

function itemsFromAutoGroups(dateKey: string): FormItem[] {
  const g = autoTugasGroupsForDate(dateKey)
  return [
    // Tugas: tidak selalu ada — 1 baris kosong saja
    makeTugasItem(null),
    // Info lain: tetap ikut jadwal (bawa atribut, dll.)
    ...g.info.map((t) => makeSimpleItem(t, "info")),
  ]
}

/** Map nama piket fix → id siswa roster bila cocok */
function piketFromSchedule(
  dateKey: string,
  students: StudentLite[],
): FormDuty[] {
  return piketNamesForDate(dateKey).map((rawName) => {
    const hit = students.find(
      (s) => formatDisplayName(s.full_name).toLowerCase() === formatDisplayName(rawName).toLowerCase(),
    )
    return {
      student_id: hit?.id ?? `name-${rawName.toLowerCase().replace(/\s+/g, "-")}`,
      name: formatDisplayName(rawName),
    }
  })
}

export type InfoBriefEditData = {
  id: string
  date: string
  greeting?: string | null
  uniform?: string | null
  uniform_note?: string | null
  pinned?: boolean
  payload?: {
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
      kind?: BriefItemKind
      text?: string
      subject_name?: string | null
      audience?: BriefAudience
      student_names?: string[]
      event_title?: string | null
      group?: BriefItemGroup
    }[]
  }
}

export default function InfoBriefForm({
  open,
  onClose,
  subjects,
  students,
  subjectTeachers,
  editBrief,
  onSaved,
}: {
  open: boolean
  onClose: () => void
  subjects: SubjectRow[]
  students: StudentLite[]
  subjectTeachers?: SubjectTeacherRow[] | null
  /** Data brief yang sedang diedit — form tetap “Brief Info Harian” */
  editBrief?: InfoBriefEditData | null
  onSaved: () => void | Promise<void>
}) {
  const skipAutoRef = useRef(false)
  const [dateKey, setDateKey] = useState(() => defaultBriefDateKey())
  const [greeting, setGreeting] = useState(() =>
    greetingForBrief(defaultBriefDateKey()),
  )
  const [customUniform, setCustomUniform] = useState("")
  const [customUniformNote, setCustomUniformNote] = useState("")
  const [showUniformCustom, setShowUniformCustom] = useState(false)
  const [pinned, setPinned] = useState(true)
  const [rows, setRows] = useState<FormSubject[]>(() =>
    toFormSubjects(scheduleSubjectsForDate(defaultBriefDateKey())),
  )
  const [duties, setDuties] = useState<FormDuty[]>(() =>
    piketFromSchedule(defaultBriefDateKey(), students),
  )
  const [items, setItems] = useState<FormItem[]>(() =>
    itemsFromAutoGroups(defaultBriefDateKey()),
  )
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const teacherMap = useMemo(
    () => subjectTeacherLookup(subjectTeachers),
    [subjectTeachers],
  )
  const activeStudents = useMemo(
    () => students.filter((s) => s.active !== false),
    [students],
  )

  const autoUniform = useMemo(() => uniformForDate(dateKey), [dateKey])
  const schoolDay = isSchoolDay(dateKey)
  const uniform = customUniform.trim() || autoUniform.label
  const uniformNote = customUniform.trim()
    ? customUniformNote.trim()
    : autoUniform.note

  const rel = relativeDayLabel(dateKey)
  const dateLong = formatBriefDateLong(dateKey)
  const fixedTitle = briefTitleForDate(dateKey)

  useEffect(() => {
    if (!open) return
    if (!editBrief) return
    skipAutoRef.current = true
    const auto = uniformForDate(editBrief.date)
    const u = (editBrief.uniform || "").trim()
    const custom = Boolean(u) && u !== auto.label
    setDateKey(editBrief.date)
    setPinned(editBrief.pinned !== false)
    setCustomUniform(custom ? u : "")
    setCustomUniformNote(custom ? (editBrief.uniform_note || "").trim() : "")
    setShowUniformCustom(false)
    setGreeting(greetingForBrief(editBrief.date))
    const p = editBrief.payload || {}
    if (p.subjects?.length) {
      setRows(
        p.subjects.map((s) => ({
          subject_id: s.subject_id ?? null,
          name: s.name || "",
          short_name: s.short_name ?? null,
          jp: Number(s.jp) || 1,
          time: s.time ?? null,
          session: s.session ?? null,
          teacher: s.teacher ?? null,
        })),
      )
    } else {
      setRows(toFormSubjects(scheduleSubjectsForDate(editBrief.date)))
    }
    if (p.duties?.length) {
      setDuties(
        p.duties.map((d, i) => ({
          student_id: d.student_id || `name-${i}`,
          name: fixDutyName(d.name || ""),
        })),
      )
    } else {
      setDuties(piketFromSchedule(editBrief.date, students))
    }
    if (p.items?.length) {
      setItems(
        p.items.map((it) => ({
          kind: it.kind || "CUSTOM",
          text: it.text || "",
          subject_id: null,
          subject_name: it.subject_name ?? null,
          audience: it.audience || "ALL",
          student_ids: [],
          student_names: it.student_names || [],
          event_title: it.event_title || "",
          group: it.group || "info",
        })),
      )
    } else {
      setItems(itemsFromAutoGroups(editBrief.date))
    }
  }, [open, editBrief, students])

  useEffect(() => {
    setCustomUniform("")
    setCustomUniformNote("")
    setShowUniformCustom(false)
    if (skipAutoRef.current) {
      skipAutoRef.current = false
      return
    }
    setRows(toFormSubjects(scheduleSubjectsForDate(dateKey)))
    setGreeting(greetingForBrief(dateKey))
    setDuties(piketFromSchedule(dateKey, students))
    setItems(itemsFromAutoGroups(dateKey))
  }, [dateKey, students, open])

  const preview = useMemo(
    () =>
      generateBriefBody({
        dateKey,
        greeting,
        uniform,
        uniform_note: uniformNote,
        subjects: rows.map((r) => ({
          subject_id: r.subject_id,
          name: r.name,
          short_name: r.short_name,
          jp: r.jp,
          note: null,
          time: r.time ?? null,
          session: r.session ?? null,
          teacher: r.teacher ?? null,
        })),
        duties: duties.map((d) => ({ student_id: d.student_id, name: d.name })),
        rosterSize: activeStudents.length,
        items: items
          .filter((i) => i.text.trim())
          .map((i) => ({
            kind: i.kind,
            text: i.text,
            subject_id: i.subject_id,
            subject_name: i.subject_name,
            audience: i.audience,
            student_names: i.student_names,
            event_title: i.event_title || null,
            group: i.group,
          })),
      }),
    [dateKey, greeting, uniform, uniformNote, rows, duties, items, activeStudents],
  )

  /** Deteksi perubahan saat edit mode */
  const formSignature = useMemo(() => {
    const normItems = items.map((i) => ({
      g: i.group,
      t: (i.text || "").trim(),
      s: i.subject_name || "",
      n: (i.student_names || []).join("|"),
      e: i.event_title || "",
    }))
    return JSON.stringify({
      date: dateKey,
      pin: pinned,
      u: uniform,
      un: uniformNote,
      sub: rows.map((r) => [r.name, r.short_name || "", Number(r.jp) || 0, r.session ?? null]),
      duty: duties.map((d) => d.name),
      items: normItems,
    })
  }, [dateKey, pinned, uniform, uniformNote, rows, duties, items])

  const editSignature = useMemo(() => {
    if (!editBrief) return ""
    const auto = uniformForDate(editBrief.date)
    const p = editBrief.payload || {}
    return JSON.stringify({
      date: editBrief.date,
      pin: editBrief.pinned !== false,
      u: (editBrief.uniform || "").trim() || auto.label,
      un: (editBrief.uniform || "").trim()
        ? (editBrief.uniform_note || "").trim()
        : auto.note,
      sub: (p.subjects || []).map((s) => [
        s.name || "",
        s.short_name || "",
        Number(s.jp) || 0,
        s.session ?? null,
      ]),
      duty: (p.duties || []).map((d) => d.name || ""),
      items: (p.items || []).map((i) => ({
        g: i.group || "info",
        t: (i.text || "").trim(),
        s: i.subject_name || "",
        n: (i.student_names || []).join("|"),
        e: i.event_title || "",
      })),
    })
  }, [editBrief])

  const isEditMode = Boolean(editBrief)
  const isDirty = isEditMode && formSignature !== editSignature

  const t = useT()
  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const reset = () => {
    const next = defaultBriefDateKey()
    setDateKey(next)
    setGreeting(greetingForBrief(next))
    setCustomUniform("")
    setCustomUniformNote("")
    setShowUniformCustom(false)
    setPinned(true)
    setRows(toFormSubjects(scheduleSubjectsForDate(next)))
    setDuties(piketFromSchedule(next, students))
    setItems(itemsFromAutoGroups(next))
    setErr(null)
    setCopied(false)
  }

  const reloadTimetable = () => {
    setRows(toFormSubjects(scheduleSubjectsForDate(dateKey)))
  }

  const reloadPiket = () => {
    setDuties(piketFromSchedule(dateKey, students))
  }

  const reloadTugas = () => {
    setItems(itemsFromAutoGroups(dateKey))
  }

  const subjectChips = useMemo(() => subjectChipsForDate(dateKey), [dateKey])

  const patchItem = (index: number, patch: Partial<FormItem>) => {
    setItems((p) => p.map((row, j) => (j === index ? { ...row, ...patch } : row)))
  }

  const addItem = (group: BriefItemGroup = "info") => {
    if (group === "tugas" || group === "remedial") {
      const base = makeTugasItem(subjectChips[0]?.short ?? null)
      setItems((p) => [
        ...p,
        {
          ...base,
          group,
          audience: group === "remedial" ? "REMEDIAL" : "ALL",
        },
      ])
      return
    }
    setItems((p) => [...p, makeSimpleItem("", group)])
  }

  const mapelOptions = useMemo(() => {
    const list = subjectChips.map((c) => c.short)
    for (const it of items) {
      if (it.group === "tugas" && it.subject_name && !list.includes(it.subject_name)) {
        list.push(it.subject_name)
      }
    }
    return list
  }, [subjectChips, items])

  const tugasRows = items
    .map((it, index) => ({ it, index }))
    .filter((x) => x.it.group === "tugas")
  const remedialRows = items
    .map((it, index) => ({ it, index }))
    .filter((x) => x.it.group === "remedial")
  const infoRows = items
    .map((it, index) => ({ it, index }))
    .filter((x) => x.it.group === "info")

  const renderTextGroupRows = (
    rows: { it: FormItem; index: number }[],
    group: BriefItemGroup,
    label: string,
    placeholder: string,
  ) => (
    <div className="space-y-2">
      {rows.length === 0 && (
              <p className="text-xs text-ink-soft/55 px-0.5">{t("info.noEntries")}</p>
      )}
      {rows.map(({ it, index }, n) => (
        <div key={index} className="flex items-start gap-2">
          <span className="mt-8 w-4 shrink-0 text-center text-sm font-bold text-forest tabular-nums">
            {n + 1}
          </span>
          <div className="min-w-0 flex-1">
            <OptionalTextField
              label={label}
              placeholder={placeholder}
              value={it.text}
              onChange={(v) => patchItem(index, { text: v })}
            />
          </div>
          <button
            type="button"
            onClick={() => setItems((p) => p.filter((_, j) => j !== index))}
            aria-label={t("info.deleteRow")}
            className={ROW_DELETE + " mt-6"}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <button type="button" onClick={() => addItem(group)} className={ROW_ADD}>
        + Add
      </button>
    </div>
  )


  const copyWa = async () => {
    try {
      await navigator.clipboard.writeText(preview)
      setCopied(true)
      flash(t("info.waCopied"))
      setTimeout(() => setCopied(false), 2000)
    } catch {
      flash(t("info.copyFailed"))
    }
  }

  const save = async () => {
    setErr(null)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      setErr("Tanggal wajib diisi")
      return
    }
    if (!schoolDay) {
      setErr("Sabtu/Minggu libur. Pilih hari sekolah (Senin-Jumat).")
      return
    }
    setSaving(true)
    try {
      const payload: BriefPayload = {
        subjects: rows.map((r) => ({
          subject_id:
            r.subject_id &&
            !r.subject_id.startsWith("local-") &&
            !r.subject_id.startsWith("tt-")
              ? r.subject_id
              : null,
          name: r.name,
          short_name: r.short_name,
          jp: Number(r.jp) || 0,
          note: null,
          time: r.time ?? null,
          session: r.session ?? null,
          teacher: r.teacher ?? null,
        })),
        duties: duties.map((d) => ({ student_id: d.student_id, name: d.name })),
        items: items
          .filter((i) => i.text.trim())
          .map((i) => ({
            kind: i.kind,
            text: i.text.trim(),
            subject_id:
              i.subject_id && !i.subject_id.startsWith("local-")
                ? i.subject_id
                : null,
            subject_name: i.subject_name,
            audience: normalizeAudience(i.kind, i.audience),
            student_ids: i.student_ids,
            student_names: i.student_names,
            linked_event_id: null,
            event_title: i.event_title || null,
            group: i.group,
          })),
      }
      const r = await fetch("/api/info-briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "DAILY",
          date: dateKey,
          title: fixedTitle,
          greeting,
          uniform,
          uniform_note: uniformNote,
          pinned,
          payload,
        }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || t("common.failedWithStatus", { status: r.status }))
      flash(t(editBrief ? "info.briefUpdated" : "info.briefPublished"))
      reset()
      await onSaved()
      onClose()
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("common.saveFailed"))
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editBrief ? t("info.editBrief") : t("info.briefInfoTitle")}
      fullHeight
    >
      <div className="rounded-2xl bg-forest px-3 py-3.5 flex items-center justify-between gap-3 min-h-[4.5rem]">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm font-bold text-white leading-tight">
            {fixedTitle}
          </p>
          <p className="text-xs font-semibold text-lime leading-tight">
            {formatBriefDateLong(dateKey)}
          </p>
          <p className="text-[11px] text-white/55 leading-tight">
            {t("info.autoFromDate")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPinned((v) => !v)}
          aria-pressed={pinned}
          aria-label={t("info.pinHome")}
          className="flex shrink-0 items-center gap-2"
        >
          <span className="text-xs font-semibold text-white/85">{t("info.pinToggle")}</span>
          <span
            className={`h-5 w-9 rounded-full relative transition-colors ${
              pinned ? "bg-lime" : "bg-white/30"
            }`}
          >
            <span
              className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${
                pinned ? "left-[18px] bg-deep" : "left-0.5 bg-white"
              }`}
            />
          </span>
        </button>
      </div>

      {err && (
        <p className="text-[11px] text-alert bg-alert-bg border border-alert/20 rounded-xl px-3 py-2">
          {err}
        </p>
      )}

      <BriefSectionCard
        title={t("info.dayUniform")}
        subtitle={t("info.dayUniformHint")}
      >
        <Field label={t("info.date")} hint={t("info.dateHint")}>
          <input
            type="date"
            value={dateKey}
            onChange={(e) => setDateKey(e.target.value.slice(0, 10))}
            className={FIELD_SELECT}
          />
          <span className="block text-xs text-ink-soft/70 pt-0.5">
            {rel ? `${rel} · ` : ""}
            {dateLong}
            {!schoolDay && (
              <span className="ml-1 font-semibold text-alert">{t("info.holiday")}</span>
            )}
          </span>
        </Field>

        {!schoolDay && (
          <div className="rounded-xl border border-alert/30 bg-alert-bg px-3 py-2.5">
              <p className="text-sm font-bold text-alert">
                {t("info.holidayTitle", { day: autoUniform.dayLabel })}
              </p>
              <p className="text-sm-plus text-ink-soft/80 mt-0.5 leading-relaxed">
                {t("info.holidayHint")}
              </p>
            <button
              type="button"
              onClick={() => setDateKey(defaultBriefDateKey())}
              className="mt-2 rounded-xl bg-forest px-3 py-1.5 text-sm font-semibold text-white"
            >
                {t("info.nextSchoolDay")}
            </button>
          </div>
        )}

        <div className="space-y-2">
          <SectionLabel
            action={
              <button
                type="button"
                onClick={() => setShowUniformCustom((v) => !v)}
                className={PILL_PRIMARY + " shrink-0"}
              >
                <Pencil className="h-3.5 w-3.5" />
                {showUniformCustom || customUniform ? t("info.scheduleDay") : t("info.changeManual")}
              </button>
            }
          >
            {t("info.uniform")}
          </SectionLabel>

          {!showUniformCustom && !customUniform ? (
            <div className="rounded-xl border border-forest/25 bg-forest/10 px-3 py-2.5">
              <p className="text-sm font-bold text-ink leading-snug">
                {autoUniform.title}
              </p>
              {autoUniform.detail && (
                <p className="text-xs text-ink-soft/85 mt-0.5 leading-relaxed">
                  {autoUniform.detail}
                  {autoUniform.extra ? ` + ${autoUniform.extra}` : ""}
                </p>
              )}
              <p className="text-[11px] text-ink-soft/55 mt-1.5">
                {t("info.autoSchedule", { date: dateLong })}
              </p>
            </div>
          ) : (
            <div className="space-y-2 rounded-xl border border-line bg-page p-3">
              <input
                value={customUniform}
                onChange={(e) => setCustomUniform(e.target.value)}
                className={FIELD_SELECT}
                placeholder={t("info.customUniformPh")}
              />
              <input
                value={customUniformNote}
                onChange={(e) => setCustomUniformNote(e.target.value)}
                className={FIELD_SELECT}
                placeholder={t("info.customNotePh")}
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="min-w-0 flex-1 overflow-x-auto">
                    <div className="flex w-max items-center gap-x-1 whitespace-nowrap">
                      <span className="text-xs font-semibold text-ink-soft shrink-0">
                        {t("info.quickPreset")}
                      </span>
                      {(
                        [
                          {
                            label: "Sailor",
                            note: "(Kemeja Putih, Dasi, Vest, Celana/Rok Biru)",
                          },
                          { label: "Batik", note: "(Celana/Rok Biru)" },
                          {
                            label: "Pramuka",
                            note: "(Topi, Dasi/Kacu, Ring, Peluit, Buku Saku) + Bawa Seragam P.E",
                            full: "Pramuka + Accessories Lengkap",
                          },
                          { label: "Olahraga/P.E", note: "(Baju olahraga)" },
                          { label: "Bebas", note: "" },
                        ] as {
                          label: string
                          note: string
                          full?: string
                        }[]
                      ).map((u, i, arr) => {
                        const value = u.full ?? u.label
                        const active = customUniform === value
                        return (
                          <span key={u.label} className="shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setCustomUniform(value)
                                setCustomUniformNote(u.note)
                              }}
                              className={`min-h-8 px-0.5 text-xs active:opacity-70 ${
                                active
                                  ? "text-forest font-semibold underline underline-offset-2"
                                  : "text-forest font-medium"
                              }`}
                            >
                              {u.label}
                            </button>
                            {i < arr.length - 1 && (
                              <span className="text-ink-soft/45 text-xs">, </span>
                            )}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomUniform("")
                      setCustomUniformNote("")
                      setShowUniformCustom(false)
                    }}
                    aria-label={t("info.cancelPreset")}
                    className="flex min-h-8 min-w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft active:text-alert"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {customUniform && (
                  <div className="text-xs text-ink-soft/80 leading-relaxed space-y-0.5">
                    <p>
                      <span className="font-semibold text-ink">{t("info.activeLabel")} </span>
                      {customUniform}
                    </p>
                    {customUniformNote && <p>{customUniformNote}</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </BriefSectionCard>

      <BriefSectionCard
        title={t("info.subjects")}
        subtitle={t("info.kbmSubtitle", { day: autoUniform.dayLabel })}
        action={
          schoolDay ? (
            <button
              type="button"
              onClick={reloadTimetable}
              className={TEXT_ACTION}
            >
              {t("info.reloadSchedule")}
            </button>
          ) : null
        }
      >
        {!schoolDay ? (
          <p className="text-xs text-ink-soft/65">{t("info.noKbm")}</p>
        ) : rows.length === 0 ? (
          <p className="text-xs text-ink-soft/60">{t("info.emptySchedule")}</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-page border-b border-line">
                  <th className="px-2 py-1.5 text-xs font-semibold text-ink w-10">JP</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-ink whitespace-nowrap">
                    {t("info.timeCol")}
                  </th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-ink">{t("info.subjectCol")}</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-ink whitespace-nowrap">
                    {t("info.teacherCol")}
                  </th>
                  <th className="px-1 py-1.5 w-8" />
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const labels = rows.map((r) => r.short_name || r.name)
                  const spans = labels.map((_, i) => {
                    if (i > 0 && labels[i] === labels[i - 1]) return 0
                    let n = 1
                    while (i + n < labels.length && labels[i + n] === labels[i]) n++
                    return n
                  })
                  return rows.map((r, i) => {
                    const sessionNo = r.session ?? i + 1
                    const teacher = teacherFromMap(r.name, teacherMap)
                    const span = spans[i] ?? 1
                    return (
                      <tr
                        key={r.subject_id ?? `s${sessionNo}-${r.name}`}
                        className="border-b border-line/60 last:border-0"
                      >
                        <td className="px-2 py-1.5 text-xs font-bold text-ink tabular-nums whitespace-nowrap">
                          {sessionNo}
                        </td>
                        <td className="px-2 py-1.5 text-xs text-ink tabular-nums whitespace-nowrap">
                          {r.time || "-"}
                        </td>
                        {span > 0 ? (
                          <td
                            rowSpan={span}
                            className="px-2 py-1.5 text-xs font-semibold text-ink whitespace-nowrap align-middle bg-forest/[0.04] border-x border-line/40"
                          >
                            {r.short_name || r.name}
                          </td>
                        ) : null}
                        <td className="px-2 py-1.5 text-xs text-ink-soft/85 whitespace-nowrap">
                          {teacher}
                        </td>
                        <td className="px-1 py-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setRows((p) =>
                                p.filter((x) =>
                                  r.session != null
                                    ? x.session !== r.session
                                    : x.subject_id !== r.subject_id,
                                ),
                              )
                            }
                            aria-label={t("info.deleteSession", { n: sessionNo })}
                            className="h-6 w-6 rounded-md text-ink-soft hover:text-alert flex items-center justify-center"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                })()}
              </tbody>
            </table>
          </div>
        )}
      </BriefSectionCard>

      <BriefSectionCard
        title={t("info.dutyTasks")}
        subtitle={t("info.dutyTasksHint")}
      >
        <div className="space-y-2">
          <SectionLabel
            action={
              schoolDay ? (
                <button
                  type="button"
                  onClick={reloadPiket}
                  className={TEXT_ACTION}
                >
                  {t("info.todaySchedule")}
                </button>
              ) : null
            }
          >
            {t("info.duty")}
          </SectionLabel>
          <p className="text-xs text-ink-soft/65">
            {t("info.dutyHint")}
          </p>
          <StudentMultiSelect
            students={activeStudents}
            selectedIds={duties.map((d) => d.student_id)}
            selectedNames={duties.map((d) => d.name)}
            placeholder={t("poin.pickStudents")}
            onChange={(ids, names) => {
              setDuties(
                ids.map((id, i) => ({
                  student_id: id,
                  name: names[i] || formatDisplayName(id),
                })),
              )
            }}
          />
        </div>

        <div className="pt-2.5 space-y-3">
          <SectionLabel
            action={
              schoolDay ? (
                <button
                  type="button"
                  onClick={reloadTugas}
                  className={TEXT_ACTION}
                >
                  {t("info.refillAuto")}
                </button>
              ) : null
            }
          >
            {t("info.carryTitle")}
          </SectionLabel>
          <p className="text-xs text-ink-soft/65">
            {t("info.carryHint")}
          </p>

          <div className="rounded-xl border border-line bg-page p-2.5 space-y-2">
            <div>
              <p className="text-sm font-bold text-ink">{t("info.tasks")}</p>
              <p className="text-xs text-ink-soft/60 mt-0.5">
                {t("info.taskHint")}
              </p>
            </div>

            {tugasRows.length === 0 && (
              <p className="text-xs text-ink-soft/55 px-0.5">{t("info.noTaskRows")}</p>
            )}

            {tugasRows.map(({ it, index }, n) => (
              <div
                key={index}
                className="rounded-xl border border-line bg-white"
              >
                <div className="flex items-center gap-2 px-2.5 py-2 border-b border-line/50">
                  <span className="w-4 shrink-0 text-center text-sm font-bold text-forest tabular-nums">
                    {n + 1}
                  </span>
                  <select
                    value={it.subject_name ?? ""}
                    onChange={(e) => {
                      const subject_name = e.target.value || null
                      patchItem(index, { subject_name })
                    }}
                    className={FIELD_SELECT + " flex-1 min-w-0"}
                    aria-label={t("info.subjectAria")}
                  >
                    <option value="">{t("info.pickSubject")}</option>
                    {mapelOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setItems((p) => p.filter((_, j) => j !== index))}
                    aria-label={t("info.deleteTask")}
                    className={ROW_DELETE}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="px-2.5 py-2 space-y-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-ink-soft/75">{t("poin.student")}</p>
                    <StudentMultiSelect
                      students={activeStudents}
                      selectedIds={it.student_ids}
                      selectedNames={it.student_names}
                      placeholder={t("poin.pickStudents")}
                      onChange={(ids, names) =>
                        patchItem(index, { student_ids: ids, student_names: names })
                      }
                    />
                  </div>
                  <OptionalTextField
                    label={t("agenda.description")}
                    placeholder={t("info.taskDetailPh")}
                    value={it.text}
                    onChange={(v) => patchItem(index, { text: v })}
                  />
                </div>
              </div>
            ))}

            <button type="button" onClick={() => addItem("tugas")} className={ROW_ADD}>
              {t("info.add")}
            </button>
          </div>

          <div className="rounded-xl border border-line bg-page p-2.5 space-y-2">
            <div>
              <p className="text-sm font-bold text-ink">Remedial</p>
              <p className="text-xs text-ink-soft/60 mt-0.5">
                {t("info.remedialHint")}
              </p>
            </div>

            {remedialRows.length === 0 && (
              <p className="text-xs text-ink-soft/55 px-0.5">{t("info.noRemedialRows")}</p>
            )}

            {remedialRows.map(({ it, index }, n) => (
              <div key={index} className="rounded-xl border border-line bg-white">
                <div className="flex items-center gap-2 px-2.5 py-2 border-b border-line/50">
                  <span className="w-4 shrink-0 text-center text-sm font-bold text-forest tabular-nums">
                    {n + 1}
                  </span>
                  <select
                    value={it.subject_name ?? ""}
                    onChange={(e) => {
                      const subject_name = e.target.value || null
                      patchItem(index, { subject_name })
                    }}
                    className={FIELD_SELECT + " flex-1 min-w-0"}
                    aria-label={t("info.remedialSubjectAria")}
                  >
                    <option value="">{t("info.pickSubject")}</option>
                    {mapelOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setItems((p) => p.filter((_, j) => j !== index))}
                    aria-label={t("info.deleteRemedial")}
                    className={ROW_DELETE}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="px-2.5 py-2 space-y-2">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-ink-soft/75">{t("poin.student")}</p>
                    <StudentMultiSelect
                      students={activeStudents}
                      selectedIds={it.student_ids}
                      selectedNames={it.student_names}
                      placeholder={t("poin.pickStudents")}
                      onChange={(ids, names) =>
                        patchItem(index, {
                          student_ids: ids,
                          student_names: names,
                          audience: names.length ? "REMEDIAL" : it.audience,
                        })
                      }
                    />
                  </div>
                  <OptionalTextField
                    label={t("agenda.description")}
                    placeholder={t("info.remedialDetailPh")}
                    value={it.text}
                    onChange={(v) => patchItem(index, { text: v })}
                  />
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addItem("remedial")}
              className={ROW_ADD}
            >
              {t("info.add")}
            </button>
          </div>

          <div className="rounded-xl border border-line bg-page p-2.5 space-y-1.5">
            <p className="text-sm font-bold text-ink">{t("info.others")}</p>
            <p className="text-xs text-ink-soft/60">
              {t("info.othersHint")}
            </p>
            {renderTextGroupRows(infoRows, "info", t("info.infoTab"), t("info.examplePh"))}
          </div>
        </div>
      </BriefSectionCard>

      <BriefSectionCard
        title={t("info.preview")}
        subtitle={t("info.previewHint")}
        action={
          <button
            type="button"
            onClick={() => void copyWa()}
            className={PILL_PRIMARY + " shrink-0"}
          >
            <span className="inline-flex items-center gap-1">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {t("info.copyWA")}
            </span>
          </button>
        }
      >
        <pre className="whitespace-pre-wrap text-sm-plus text-ink-soft/85 leading-relaxed font-sans max-h-40 overflow-y-auto scroll-y-only rounded-xl bg-page border border-line px-3 py-2">
          {preview}
        </pre>
      </BriefSectionCard>

      <button
        type="button"
        disabled={saving || (!isEditMode && !schoolDay) || (isEditMode && isDirty && !schoolDay)}
        onClick={() => {
          if (isEditMode && !isDirty) {
            onClose()
            return
          }
          void save()
        }}
        className={
          isEditMode && !isDirty
            ? "flex w-full items-center justify-center gap-1 rounded-full border border-line bg-white px-3 py-2.5 text-sm font-semibold text-ink active:scale-[0.97] transition-transform"
            : "flex w-full items-center justify-center gap-1 rounded-full bg-forest px-3 py-2.5 text-sm font-semibold text-white active:scale-[0.97] transition-transform disabled:opacity-50"
        }
      >
        {isEditMode && !isDirty ? (
          <>{t("info.cancelEdit")}</>
        ) : (
          <>
            <Check className="h-3.5 w-3.5" />
            {saving
              ? t("kas.saving")
              : !schoolDay
                ? t("info.holidayPick")
                : isEditMode
                  ? t("info.updateBrief")
                  : t("info.publishBrief")}
          </>
        )}
      </button>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] bg-forest text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
      <div className="h-2" />
    </Sheet>
  )
}
