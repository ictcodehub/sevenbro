"use client"

import { useEffect, useState } from "react"
import { BadgeCheck } from "lucide-react"
import { formatDisplayName } from "@/lib/format"

/**
 * SSOT badge verified pengurus — dipakai di SEMUA halaman yang menampilkan nama siswa.
 *
 * Aturan: badge nempel ke TOPI (jabatan di DB), bukan daftar nama yang di-hardcode.
 * Siapapun yang di-set position-nya di Roster → langsung dapet badge.
 * - position kosong / "ANGGOTA" (posisi default siswa biasa) → tanpa badge
 * - Warna: 3 topi inti sesuai permintaan user (Ketua emas · Bendahara hijau ·
 *   Sekretaris biru). Topi lain di luar itu dapet warna otomatis dari palet
 *   (deterministik dari nama posisi), jadi posisi baru langsung kebagian.
 *
 * Sumber data: /api/admin/students (id, full_name, position, active) — terbuka
 * untuk semua role aktif. Setelah ubah roster, panggil invalidatePositions().
 */

// ── Posisi default siswa biasa — satu-satunya "kata kunci" data, bukan daftar badge ──
export const DEFAULT_POSITION = "ANGGOTA"

// ── Warna 3 topi inti (permintaan user: Ketua gold, Bendahara green, Sekretaris biru) ──
const CORE_POSITION_COLOR: Record<string, string> = {
  KETUA: "text-amber-500",
  BENDAHARA: "text-green-500",
  SEKRETARIS: "text-blue-500",
}

// ── Palet buat topi di luar 3 inti — dipilih deterministik dari nama posisi ──
const PALETTE = [
  "text-violet-500",
  "text-rose-500",
  "text-cyan-600",
  "text-orange-500",
  "text-teal-500",
  "text-fuchsia-500",
  "text-lime-600",
  "text-indigo-500",
]

function paletteColor(key: string): string {
  let h = 0
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0
  return PALETTE[h % PALETTE.length]
}

function positionKey(position: string | null | undefined): string {
  return (position ?? "").trim().toUpperCase()
}

/** Warna badge untuk posisi apapun — null = bukan pengurus (tanpa badge). */
export function positionBadgeClass(position: string | null | undefined): string | null {
  const key = positionKey(position)
  if (!key || key === DEFAULT_POSITION) return null
  return CORE_POSITION_COLOR[key] ?? paletteColor(key)
}

/** Warna label posisi — selalu mengikuti warna badge; anggota biasa netral. */
export function positionTextClass(position: string | null | undefined): string {
  return positionBadgeClass(position) ?? "text-ink-soft/70"
}

export function positionLabel(position: string | null | undefined): string {
  // Posisi bebas — Title Case generik ("WAKIL KETUA" → "Wakil Ketua")
  return formatDisplayName(position ?? "")
}

// ── Store global ringan: 1 fetch untuk seluruh app, dipakai semua halaman ──
type RosterEntry = { id: string; full_name: string; position: string | null; active?: boolean }

export type PositionIndex = {
  byId: Map<string, string>
  /** key: full_name lowercase (untuk data yang cuma bawa nama) */
  byName: Map<string, string>
}

let cache: PositionIndex | null = null
let inflight: Promise<PositionIndex> | null = null
const listeners = new Set<(m: PositionIndex) => void>()

const EMPTY: PositionIndex = { byId: new Map(), byName: new Map() }

async function loadIndex(): Promise<PositionIndex> {
  if (cache) return cache
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const r = await fetch("/api/admin/students", { headers: { Accept: "application/json" } })
      const b = await r.json().catch(() => null)
      const next: PositionIndex = { byId: new Map(), byName: new Map() }
      if (r.ok && Array.isArray(b)) {
        for (const s of b as RosterEntry[]) {
          if (!s?.id || !s.position || s.active === false) continue
          next.byId.set(s.id, s.position)
          if (s.full_name) next.byName.set(s.full_name.toLowerCase(), s.position)
        }
      }
      cache = next
      for (const fn of listeners) fn(next)
      return next
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/**
 * Hook index posisi — 1 request dibagi seluruh app (tanpa timer).
 * Pass key opsional (mis. nama halaman) biar tiap mount ikut refresh dari cache.
 */
export function usePositions(key = ""): PositionIndex {
  const [map, setMap] = useState<PositionIndex>(cache ?? EMPTY)

  useEffect(() => {
    if (cache) {
      setMap(cache)
      return
    }
    listeners.add(setMap)
    void loadIndex()
    return () => {
      listeners.delete(setMap)
    }
  }, [key])

  return map
}

/**
 * Buang cache index posisi — panggil SETELAH ubah roster (ganti posisi,
 * approve usulan, tambah/hapus/nonaktifkan siswa) supaya badge langsung ikut.
 */
export function invalidatePositions(): void {
  cache = null
  inflight = null
  if (listeners.size > 0) void loadIndex()
}

// ── Badge visual ──
export function VerifiedBadge({
  position,
  className = "h-3 w-3",
}: {
  /** Kode posisi dari DB — badge muncul otomatis untuk jabatan apapun (kecuali ANGGOTA) */
  position: string | null | undefined
  className?: string
}) {
  const color = positionBadgeClass(position)
  if (!color) return null
  return (
    <BadgeCheck
      className={`inline-block align-text-bottom shrink-0 ${className} ${color}`}
      fill="currentColor"
      stroke="white"
      strokeWidth={2.5}
      aria-label="Pengurus kelas terverifikasi"
    />
  )
}

/** Nama + badge verified dalam satu baris — pakai student_id. */
export function StudentName({
  name,
  position,
  className = "text-xs font-semibold text-ink",
  badgeClassName = "h-3 w-3",
}: {
  name: string
  position: string | null | undefined
  className?: string
  badgeClassName?: string
}) {
  return (
    <span className={`inline-flex items-center gap-0.5 min-w-0 ${className}`}>
      <span className="truncate">{formatDisplayName(name)}</span>
      <VerifiedBadge position={position} className={badgeClassName} />
    </span>
  )
}

/** Nama + badge verified — lookup by nama (untuk data yang cuma bawa nama siswa). */
export function VerifiedName({
  name,
  index,
  className = "text-xs font-semibold text-ink",
  badgeClassName = "h-3 w-3",
}: {
  name: string
  index: PositionIndex
  className?: string
  badgeClassName?: string
}) {
  const position = index.byName.get(name.toLowerCase()) ?? null
  return (
    <span className={`inline-flex items-center gap-0.5 min-w-0 ${className}`}>
      <span className="truncate">{formatDisplayName(name)}</span>
      <VerifiedBadge position={position} className={badgeClassName} />
    </span>
  )
}
