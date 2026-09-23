// ============================================================
// Role efektif per-request (matriks takeover / plan FASE 1)
//
// users.role di DB : HOMEROOM | TEACHER | STUDENT | PENDING
// role efektif app : HOMEROOM | TEACHER | <students.position> | PENDING
//
// Aturan:
//  - HOMEROOM (users.role) → HOMEROOM
//  - TEACHER (users.role) → TEACHER
//  - STUDENT + students.position terisi → position itu sendiri
//    (posisi bebas — daftar & nama pengurus bisa berubah tiap rotasi roster)
//  - selain itu → PENDING (belum aktif di kelas)
// ============================================================

import { formatDisplayName } from "./format"

export function resolveEffectiveRole(
  usersRole: string | null | undefined,
  studentPosition: string | null | undefined,
): string {
  if (usersRole === "HOMEROOM") return "HOMEROOM"
  if (usersRole === "TEACHER") return "TEACHER"
  if (usersRole === "STUDENT") {
    const position = studentPosition?.trim()
    if (position) return position
    return "PENDING"
  }
  return "PENDING"
}

const ROLE_LABELS: Record<string, string> = {
  HOMEROOM: "Wali Kelas",
  TEACHER: "Guru",
  KETUA: "Ketua",
  BENDAHARA: "Bendahara",
  SEKRETARIS: "Sekretaris",
  ANGGOTA: "Anggota",
  PENDING: "Menunggu",
}

/** Label role untuk UI (Title Case Indonesia). Jangan tampilkan kode mentah. */
export function formatRoleLabel(role: string | null | undefined): string {
  if (!role) return "Siswa"
  // Posisi bebas di luar peta → Title Case generik (mis. "WAKIL KETUA" → "Wakil Ketua")
  return ROLE_LABELS[role] ?? formatDisplayName(role)
}
