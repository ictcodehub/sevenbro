"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Camera,
  Check,
  Flag,
  ImagePlus,
  X,
} from "lucide-react"
import { RoleGate } from "@/components/RoleGate"
import { useAppSWR } from "@/lib/fetcher"
import { formatDisplayName } from "@/lib/format"
import { canCreateMassReport } from "@/lib/policies"
import { inputClass } from "@/components/ui/sheet"

const PAGE_ROLES = ["HOMEROOM", "KETUA"]

const CUSTOM = "__CUSTOM__"

type Student = { id: string; full_name: string; position: string }
type Preset = { label: string; delta: number; builtin: boolean }
type PresetsPayload = { presets: Preset[]; reports: unknown[] }

async function compressImage(file: File): Promise<{ data: string; mime: string }> {
  const bitmap = await createImageBitmap(file)
  const max = 960
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)
  const canvas = document.createElement("canvas")
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Canvas gagal")
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const dataUrl = canvas.toDataURL("image/jpeg", 0.7)
  return { data: dataUrl, mime: "image/jpeg" }
}

export default function NewReportPage() {
  return (
    <RoleGate allow={PAGE_ROLES}>
      <NewReportInner />
    </RoleGate>
  )
}

function NewReportInner() {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const router = useRouter()
  const { data } = useAppSWR<PresetsPayload>("/api/mass-reports")
  const { data: students } = useAppSWR<Student[]>("/api/admin/students")

  const [reason, setReason] = useState("")
  const [customOpen, setCustomOpen] = useState(false)
  const [customText, setCustomText] = useState("")
  const [note, setNote] = useState("")
  const [targets, setTargets] = useState<Set<string>>(new Set())
  const [photo, setPhoto] = useState<{ data: string; mime: string; preview: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const presets = data?.presets?.filter((p) => p.label !== CUSTOM) ?? []
  const canSubmit = canCreateMassReport(role ?? "")

  useEffect(() => {
    if (reason !== CUSTOM) {
      setCustomOpen(false)
    } else {
      setCustomOpen(true)
    }
  }, [reason])

  const selectedPreset = presets.find((p) => p.label === reason)
  const finalReason = reason === CUSTOM ? customText.trim() : reason
  const delta = reason === CUSTOM ? 1 : selectedPreset?.delta ?? 1

  const toggle = (id: string) => {
    setTargets((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const onPhoto = async (file: File | undefined) => {
    if (!file) return
    try {
      setErr(null)
      const compressed = await compressImage(file)
      const preview = compressed.data
      setPhoto({ data: compressed.data, mime: compressed.mime, preview })
    } catch {
      setErr("Gagal memproses foto")
    }
  }

  const submit = async () => {
    if (!finalReason) {
      setErr("Pilih alasan atau tulis custom")
      return
    }
    if (targets.size === 0) {
      setErr("Pilih minimal satu target")
      return
    }
    setSaving(true)
    setErr(null)
    try {
      const r = await fetch("/api/mass-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: finalReason,
          isCustom: reason === CUSTOM,
          delta: reason === CUSTOM ? Math.max(1, Math.abs(delta)) : delta,
          note: note.trim() || undefined,
          targetIds: [...targets],
          photoData: photo?.data,
          photoMime: photo?.mime,
        }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || "Gagal membuat report")
      router.push("/app/poin")
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal")
    } finally {
      setSaving(false)
    }
  }

  if (!canSubmit) {
    return (
      <div className="px-4 py-3">
        <p className="text-xs text-ink-soft/70">Hanya Ketua / Wali Kelas.</p>
      </div>
    )
  }

  return (
    <div className="min-h-full bg-page flex flex-col">
      <header className="sticky top-0 z-40 bg-white border-b border-line">
        <div className="flex items-center gap-2 px-4 h-14">
          <Link
            href="/app/poin"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-ink"
            aria-label="Kembali"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-base font-bold text-ink leading-tight">Buat Mass Report</h1>
            <p className="text-xs text-alert font-semibold">Ketua · menunggu vote & review</p>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-4 space-y-5">
        {/* Alasan */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-ink">Alasan (Preset)</label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={inputClass}
          >
            <option value="">Pilih alasan…</option>
            {presets.map((p) => (
              <option key={p.label} value={p.label}>
                {p.label} (−{p.delta})
              </option>
            ))}
            <option value={CUSTOM}>Custom Report</option>
          </select>

          {customOpen && (
            <div className="mt-2 space-y-1.5 rounded-xl bg-alert/5 border border-alert/20 p-3">
              <p className="text-xs text-ink-soft/70 leading-snug">
                Tulis pelanggaran sendiri. Vote langsung jalan; wali kelas bisa perbaiki
                kalimat sebelum dijadikan preset permanen.
              </p>
              <textarea
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                rows={3}
                placeholder="Contoh: Memukul teman…"
                className={inputClass + " resize-none scroll-y-only"}
              />
            </div>
          )}
        </div>

        {/* Target */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-ink">Target siswa</label>
            <span className="text-xs text-ink-soft/60">{targets.size} dipilih</span>
          </div>
          <div className="bg-white border border-line shadow-sm rounded-2xl divide-y divide-line/50 max-h-72 overflow-y-auto">
            {(students ?? []).map((s) => {
              const on = targets.has(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggle(s.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink truncate">
                      {formatDisplayName(s.full_name)}
                    </p>
                    {s.position !== "ANGGOTA" && (
                      <p className="text-xs text-ink-soft/55">{s.position}</p>
                    )}
                  </div>
                  <span
                    className={`h-5 w-5 rounded-full border-2 shrink-0 flex items-center justify-center ${
                      on ? "bg-alert border-alert text-white" : "border-line bg-white"
                    }`}
                  >
                    {on && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                </button>
              )
            })}
            {(students ?? []).length === 0 && (
              <p className="p-4 text-center text-xs text-ink-soft/50">Memuat siswa…</p>
            )}
          </div>
        </div>

        {/* Foto bukti */}
        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-ink">Foto bukti (opsional)</label>
          <div className="rounded-xl border border-dashed border-line bg-white p-3">
            {photo?.preview ? (
              <div className="space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.preview}
                  alt="Bukti"
                  className="w-full max-h-48 object-contain rounded-lg bg-page"
                />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-alert"
                >
                  <X className="h-3 w-3" />
                  Hapus foto
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <label className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-surface text-sm font-semibold text-forest cursor-pointer">
                  <ImagePlus className="h-4 w-4" />
                  Pilih foto
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => void onPhoto(e.target.files?.[0])}
                  />
                </label>
                <label className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest/10 text-forest">
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => void onPhoto(e.target.files?.[0])}
                  />
                </label>
              </div>
            )}
          </div>
          {photo && (
            <p className="text-xs text-ink-soft/55">
              Foto dikompres otomatis · hanya wali kelas yang bisa melihat yang utuh
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-ink">Catatan (opsional)</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Detail kejadian, waktu, saksi…"
            className={inputClass + " resize-none scroll-y-only"}
          />
        </div>

        {err && (
          <p className="text-xs text-alert bg-alert-bg border border-alert/20 rounded-xl px-3 py-2">
            {err}
          </p>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-line bg-white/95 backdrop-blur px-4 py-3">
        <button
          type="button"
          disabled={saving || !finalReason || targets.size === 0}
          onClick={() => void submit()}
          className="w-full flex items-center justify-center gap-2 bg-alert text-white text-sm font-bold py-3 rounded-xl disabled:opacity-50 active:scale-[0.98]"
        >
          <Flag className="h-4 w-4" />
          {saving ? "Mengirim…" : `Buka Report · −${delta} poin`}
        </button>
        <p className="mt-1.5 text-center text-xs text-ink-soft/50">
          {targets.size} target · vote kelas → review wali kelas
        </p>
      </div>
    </div>
  )
}
