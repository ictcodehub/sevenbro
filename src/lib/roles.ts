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

const ROLE_LABELS_ID: Record<string, string> = {
  HOMEROOM: "Wali Kelas",
  TEACHER: "Guru",
  KETUA: "Ketua",
  BENDAHARA: "Bendahara",
  SEKRETARIS: "Sekretaris",
  ANGGOTA: "Anggota",
  PENDING: "Menunggu",
}

const ROLE_LABELS_EN: Record<string, string> = {
  HOMEROOM: "Homeroom",
  TEACHER: "Teacher",
  KETUA: "Leader",
  BENDAHARA: "Treasurer",
  SEKRETARIS: "Secretary",
  ANGGOTA: "Member",
  PENDING: "Pending",
}

/** Label role untuk UI. Jangan tampilkan kode mentah. */
export function formatRoleLabel(
  role: string | null | undefined,
  lang: "id" | "en" = "id",
): string {
  if (!role) return lang === "en" ? "Student" : "Siswa"
  const map = lang === "en" ? ROLE_LABELS_EN : ROLE_LABELS_ID
  return map[role] ?? formatDisplayName(role)
}
