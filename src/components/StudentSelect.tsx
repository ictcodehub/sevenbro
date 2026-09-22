"use client"

import { useState, type ReactNode } from "react"
import { Check, ChevronDown, User } from "lucide-react"
import { formatDisplayName } from "@/lib/format"
import { useT } from "@/lib/i18n"

export type StudentLite = {
  id: string
  full_name: string
  position?: string | null
  active?: boolean
}

/**
 * Select nama siswa — SSOT: docs/DESIGN_SYSTEM.md § Select nama siswa
 * User icon · truncate · list floating full-width · radio forest
 * Placeholder "Pilih Nama Siswa". DILARANG: native <select>.
 */

const triggerClass =
  "min-h-11 w-full flex items-center gap-2 border-b border-forest/40 py-2 text-left"

/** Panel opsi: full width + floating — ±10 baris lalu scroll */
const listClass =
  "absolute left-0 right-0 top-full z-30 mt-0.5 w-full max-h-[26rem] overflow-y-auto scroll-y-only bg-white border border-line rounded-xl shadow-lg py-1"

function Trigger({
  open,
  display,
  hasValue,
}: {
  open: boolean
  display: string
  hasValue: boolean
}) {
  return (
    <>
      <User className="h-4 w-4 shrink-0 text-ink-soft/70" />
      <span
        className={`min-w-0 flex-1 truncate text-[12px] ${
          hasValue ? "text-ink" : "text-ink-soft/60"
        }`}
      >
        {display}
      </span>
      <ChevronDown
        className={`h-4 w-4 shrink-0 text-ink-soft transition-transform ${
          open ? "rotate-180" : ""
        }`}
      />
    </>
  )
}

function OptionRow({
  on,
  name,
  onClick,
}: {
  on: boolean
  name: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-10 w-full items-center gap-2 px-3 py-2 text-left active:bg-surface"
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
          on ? "border-forest bg-forest text-white" : "border-line bg-white"
        }`}
      >
        {on && <Check className="h-2.5 w-2.5" />}
      </span>
      <span className="min-w-0 flex-1 truncate text-[12px] text-ink">{name}</span>
    </button>
  )
}

function StudentListPanel({
  children,
  ariaLabel,
}: {
  children: ReactNode
  ariaLabel?: string
}) {
  return (
    <div className={listClass} role="listbox" aria-label={ariaLabel}>
      {children}
    </div>
  )
}

/** Single-select — Beri Poin, dsb. */
export function StudentSelect({
  students,
  value,
  onChange,
  placeholder,
}: {
  students: StudentLite[]
  value: string
  onChange: (id: string) => void
  placeholder?: string
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const selected = students.find((s) => s.id === value)
  const display = selected
    ? formatDisplayName(selected.full_name)
    : (placeholder ?? t("poin.pickStudents"))

  return (
    <div className="relative w-full min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={triggerClass}
      >
        <Trigger open={open} display={display} hasValue={Boolean(selected)} />
      </button>
      {open && (
        <StudentListPanel ariaLabel="Daftar siswa">
          {students.map((s) => (
            <OptionRow
              key={s.id}
              on={s.id === value}
              name={formatDisplayName(s.full_name)}
              onClick={() => {
                onChange(s.id)
                setOpen(false)
              }}
            />
          ))}
        </StudentListPanel>
      )}
    </div>
  )
}

/** Multi-select — Brief Tugas / Remedial · Beri Poin (multi siswa) */
export function StudentMultiSelect({
  students,
  selectedIds,
  selectedNames,
  onChange,
  placeholder,
  selectAllLabel,
  selectAllMode = "all",
}: {
  students: StudentLite[]
  selectedIds: string[]
  selectedNames: string[]
  onChange: (ids: string[], names: string[]) => void
  placeholder?: string
  /** Label baris atas daftar */
  selectAllLabel?: string
  /** all = centang semua / toggle · clear = kosongkan */
  selectAllMode?: "clear" | "all"
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const display =
    selectedNames.length > 0
      ? selectedNames.join(", ")
      : (placeholder ?? t("poin.pickStudents"))

  const toggleStudent = (id: string, name: string) => {
    const idx = selectedIds.indexOf(id)
    if (idx >= 0) {
      onChange(
        selectedIds.filter((x) => x !== id),
        selectedNames.filter((_, i) => i !== idx),
      )
    } else {
      onChange([...selectedIds, id], [...selectedNames, name])
    }
  }

  const handleSelectAll = () => {
    if (selectAllMode === "clear") {
      onChange([], [])
      return
    }
    // all: sudah ada terpilih → kosongkan; masih kosong → pilih semua
    if (selectedIds.length > 0) {
      onChange([], [])
      return
    }
    onChange(
      students.map((s) => s.id),
      students.map((s) => formatDisplayName(s.full_name)),
    )
  }

  const selectAllText =
    selectAllMode === "all"
      ? selectedIds.length > 0
        ? t("poin.clearAll")
        : (selectAllLabel ?? t("common.allStudents"))
      : (selectAllLabel ?? t("poin.clearAll"))

  return (
    <div className="relative w-full min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={triggerClass}
      >
        <Trigger
          open={open}
          display={display}
          hasValue={selectedNames.length > 0}
        />
      </button>

      {open && (
        <StudentListPanel ariaLabel="Daftar siswa">
          <button
            type="button"
            onClick={handleSelectAll}
            className={`min-h-10 w-full px-3 py-2 text-left text-[12px] font-medium active:bg-surface ${
              selectAllMode === "all" && selectedIds.length > 0
                ? "text-alert"
                : "text-forest"
            }`}
          >
            {selectAllText}
          </button>
          {students.map((s) => (
            <OptionRow
              key={s.id}
              on={selectedIds.includes(s.id)}
              name={formatDisplayName(s.full_name)}
              onClick={() => toggleStudent(s.id, formatDisplayName(s.full_name))}
            />
          ))}
        </StudentListPanel>
      )}
    </div>
  )
}
