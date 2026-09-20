"use client"

import { useEffect, useState } from "react"
import { Check } from "lucide-react"
import { useAppSWR } from "@/lib/fetcher"
import { inputClass } from "@/components/ui/sheet"
import type { SubjectTeacherRow } from "@/lib/info-brief"

/**
 * Guru mapel — frame section standar (kotak putih + header page)
 * + isi tabel ringkas, sama seperti Tugas / Membawa di Brief.
 */
export default function SubjectTeachersAdmin() {
  const { data, mutate } = useAppSWR<SubjectTeacherRow[]>("/api/admin/subject-teachers")
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    const next: Record<string, string> = {}
    for (const r of data ?? []) next[r.subject_name] = r.teacher_name
    setDrafts(next)
  }, [data])

  const flash = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  const saveOne = async (subject_name: string) => {
    const teacher_name = (drafts[subject_name] ?? "").trim()
    if (!teacher_name) {
      setErr(`Nama guru ${subject_name} wajib diisi`)
      return
    }
    setErr(null)
    setSavingKey(subject_name)
    try {
      const r = await fetch("/api/admin/subject-teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject_name, teacher_name, active: true }),
      })
      const b = await r.json().catch(() => null)
      if (!r.ok) throw new Error(b?.error || `Gagal (${r.status})`)
      flash(`Tersimpan: ${subject_name}`)
      await mutate()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan")
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
      <div className="flex items-start justify-between gap-2 border-b border-line bg-page px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">Guru Mapel</p>
          <p className="text-xs text-ink-soft/70 leading-snug">
            Tabel Brief Info · ganti guru di sini, tanpa deploy
          </p>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {err && (
          <p className="text-xs text-alert bg-alert-bg border border-alert/20 rounded-xl px-3 py-2">
            {err}
          </p>
        )}

        {!data ? (
          <div className="rounded-xl border border-dashed border-line bg-page px-3 py-4 text-center">
            <p className="text-xs font-semibold text-ink-soft">Memuat daftar mapel…</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-page border-b border-line">
                  <th className="px-2 py-1.5 text-xs font-semibold text-ink w-8">No.</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-ink">Mapel</th>
                  <th className="px-2 py-1.5 text-xs font-semibold text-ink whitespace-nowrap">
                    Nama Guru
                  </th>
                  <th className="px-1 py-1.5 w-10" />
                </tr>
              </thead>
              <tbody>
                {(data ?? []).map((row, i) => {
                  const value = drafts[row.subject_name] ?? row.teacher_name
                  const dirty = value.trim() !== row.teacher_name.trim()
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-line/60 last:border-0 bg-white"
                    >
                      <td className="px-2 py-1.5 text-xs text-ink-soft tabular-nums align-middle">
                        {i + 1}
                      </td>
                      <td className="px-2 py-1.5 text-sm font-semibold text-ink align-middle whitespace-nowrap">
                        {row.subject_name}
                      </td>
                      <td className="px-2 py-1.5 align-middle">
                        <input
                          value={value}
                          onChange={(e) =>
                            setDrafts((p) => ({ ...p, [row.subject_name]: e.target.value }))
                          }
                          className={inputClass + " !py-1 !text-xs min-w-[140px]"}
                          placeholder="Nama guru"
                        />
                      </td>
                      <td className="px-1 py-1.5 align-middle">
                        <button
                          type="button"
                          disabled={!dirty || savingKey === row.subject_name}
                          onClick={() => void saveOne(row.subject_name)}
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-white bg-forest disabled:opacity-30"
                          aria-label={`Simpan ${row.subject_name}`}
                        >
                          {savingKey === row.subject_name ? (
                            <span className="text-[11px]">…</span>
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-ink-soft/55 px-0.5">
          Ubah nama lalu tekan centang di baris yang sama.
        </p>
      </div>

      {toast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 bg-forest text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
