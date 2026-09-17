// ============================================================
// Role efektif per-request (matriks takeover / plan FASE 1)
//
// users.role di DB : HOMEROOM | TEACHER | STUDENT | PENDING
// role efektif app : HOMEROOM | TEACHER | KETUA | BENDAHARA | SEKRETARIS | ANGGOTA | PENDING
//
// Aturan:
//  - HOMEROOM (users.role) → HOMEROOM
//  - TEACHER (users.role) → TEACHER
//  - STUDENT + cocok students.position → position itu
//  - selain itu → PENDING (belum aktif di kelas)
// ============================================================

const STUDENT_POSITIONS = ["KETUA", "BENDAHARA", "SEKRETARIS", "ANGGOTA"] as const

export type StudentPosition = (typeof STUDENT_POSITIONS)[number]

export function resolveEffectiveRole(
  usersRole: string | null | undefined,
  studentPosition: string | null | undefined,
): string {
  if (usersRole === "HOMEROOM") return "HOMEROOM"
  if (usersRole === "TEACHER") return "TEACHER"
  if (usersRole === "STUDENT") {
    if (studentPosition && (STUDENT_POSITIONS as readonly string[]).includes(studentPosition)) {
      return studentPosition
    }
    return "PENDING"
  }
  return "PENDING"
}

export function isStudentPosition(value: string | null | undefined): value is StudentPosition {
  return !!value && (STUDENT_POSITIONS as readonly string[]).includes(value)
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
  return ROLE_LABELS[role] ?? "Siswa"
}
