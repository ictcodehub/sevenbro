// Auto-match akun PENDING → siswa roster
// Aturan: auto hanya match kuat; fuzzy = saran, Homeroom tetap konfirmasi.

import { formatDisplayName } from "./format"

export type MatchCandidate = {
  id: string
  full_name: string
  email?: string | null
}

function normName(raw: string | null | undefined): string {
  return formatDisplayName(raw || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function tokens(name: string): string[] {
  return normName(name).split(" ").filter(Boolean)
}

/** Skor 0–1: seberapa mirip dua nama (untuk saran, bukan auto) */
export function nameSimilarity(a: string, b: string): number {
  const ta = tokens(a)
  const tb = tokens(b)
  if (!ta.length || !tb.length) return 0
  const sa = new Set(ta)
  const sb = new Set(tb)
  let hit = 0
  for (const t of sa) if (sb.has(t)) hit += 1
  // token sama / total token terpanjang
  return hit / Math.max(sa.size, sb.size)
}

export type PendingMatchResult = {
  /** Auto-link: email persis atau nama lengkap persis */
  auto: MatchCandidate | null
  /** Saran fuzzy (nama belakang / mirip) — jangan auto */
  suggestion: MatchCandidate | null
  reason: string
}

/**
 * Contoh kasus:
 * Google "Avriel Sitorus" vs roster "Gavriella Mulia Sitorus"
 * → bukan auto; suggestion = Gavriella (marga Sitorus sama)
 */
export function matchPendingToStudents(
  user: { name?: string | null; email?: string | null },
  students: MatchCandidate[],
): PendingMatchResult {
  const uEmail = (user.email || "").trim().toLowerCase()
  const uName = normName(user.name)
  const uTokens = tokens(user.name || "")

  // 1) Email persis di roster → AUTO
  if (uEmail) {
    const byEmail = students.find(
      (s) => (s.email || "").trim().toLowerCase() === uEmail,
    )
    if (byEmail) {
      return { auto: byEmail, suggestion: null, reason: "email" }
    }
  }

  // 2) Nama lengkap persis (setelah normalisasi) → AUTO
  if (uName) {
    const byName = students.find((s) => normName(s.full_name) === uName)
    if (byName) {
      // kalau roster sudah punya email lain, tetap auto-link user ke siswa tsb
      // (email Google ditulis ke students saat tautkan)
      return { auto: byName, suggestion: null, reason: "nama" }
    }
  }

  if (!uTokens.length) {
    return { auto: null, suggestion: null, reason: "" }
  }

  const uLast = uTokens[uTokens.length - 1]!
  const uFirst = uTokens[0]!

  // 3) Fuzzy → saran saja
  let best: { s: MatchCandidate; score: number } | null = null
  for (const s of students) {
    const t = tokens(s.full_name)
    if (!t.length) continue
    const last = t[t.length - 1]!
    const first = t[0]!
    const sim = nameSimilarity(user.name || "", s.full_name)
    let score = sim
    // marga / kata terakhir sama + depan mirip → naik skor
    if (last === uLast) score = Math.max(score, 0.55)
    if (last === uLast && (first.startsWith(uFirst.slice(0, 3)) || uFirst.startsWith(first.slice(0, 3)))) {
      score = Math.max(score, 0.7)
    }
    if (!best || score > best.score) best = { s, score }
  }

  if (best && best.score >= 0.55) {
    return {
      auto: null,
      suggestion: best.s,
      reason:
        best.score >= 0.85
          ? "nama-hampir"
          : "marga-mirip",
    }
  }

  return { auto: null, suggestion: null, reason: "" }
}
