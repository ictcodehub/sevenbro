// ============================================================
// Kebijakan izin (role-based) KelasKita 7B
//
// Role sistem (huruf kapital, case-sensitive):
//   HOMEROOM — wali kelas (akses penuh)
//   TEACHER — guru mapel yang diizinkan homeroom (kasih poin / scan)
//   KETUA, SEKRETARIS, BENDAHARA — pengurus kelas
//   ANGGOTA — siswa biasa
//   PENDING — belum disetujui, tidak bisa memakai app
// ============================================================

const ACTIVE_ROLES = [
  "HOMEROOM",
  "TEACHER",
  "KETUA",
  "BENDAHARA",
  "SEKRETARIS",
  "ANGGOTA",
] as const

function isAllowed(role: string, allowed: readonly string[]): boolean {
  return allowed.includes(role)
}

/** Boleh posting pengumuman: HOMEROOM, KETUA, SEKRETARIS */
export function canPostAnnouncement(role: string): boolean {
  return isAllowed(role, ["HOMEROOM", "KETUA", "SEKRETARIS"])
}

/** Boleh kelola agenda: HOMEROOM, KETUA, SEKRETARIS */
export function canManageAgenda(role: string): boolean {
  return isAllowed(role, ["HOMEROOM", "KETUA", "SEKRETARIS"])
}

/** Boleh kelola kas: HOMEROOM, BENDAHARA */
export function canManageKas(role: string): boolean {
  return isAllowed(role, ["HOMEROOM", "BENDAHARA"])
}

/** Boleh lihat kas (read-only termasuk Buku Kas): semua siswa aktif + Homeroom */
export function canViewKas(role: string): boolean {
  return isAllowed(role, ["HOMEROOM", "KETUA", "BENDAHARA", "SEKRETARIS", "ANGGOTA"])
}

/** Boleh memberi poin: HOMEROOM, TEACHER */
export function canGivePoints(role: string): boolean {
  return isAllowed(role, ["HOMEROOM", "TEACHER"])
}

/** Akses admin/roster: HOMEROOM saja */
export function canAdmin(role: string): boolean {
  return isAllowed(role, ["HOMEROOM"])
}

/** Buka halaman roster: HOMEROOM + KETUA */
export function canViewRoster(role: string): boolean {
  return isAllowed(role, ["HOMEROOM", "KETUA"])
}

/** Mutasi roster langsung: HOMEROOM saja */
export function canManageRoster(role: string): boolean {
  return isAllowed(role, ["HOMEROOM"])
}

/** Usul perubahan roster (butuh approval Homeroom): KETUA */
export function canProposeRoster(role: string): boolean {
  return isAllowed(role, ["KETUA"])
}

/** Boleh buka / kelola Mass Report (create + vote view): siswa aktif + Homeroom */
export function canUseMassReport(role: string): boolean {
  return isAllowed(role, ["HOMEROOM", "KETUA", "BENDAHARA", "SEKRETARIS", "ANGGOTA"])
}

/** Buat Mass Report: KETUA saja — Homeroom hanya review */
export function canCreateMassReport(role: string): boolean {
  return isAllowed(role, ["KETUA"])
}

/** Vote Mass Report: semua siswa aktif kecuali TEACHER */
export function canVoteMassReport(role: string): boolean {
  return canUseMassReport(role)
}

/** Review Mass Report (approve/reject → potong poin): HOMEROOM */
export function canReviewMassReport(role: string): boolean {
  return isAllowed(role, ["HOMEROOM"])
}

/**
 * Boleh memakai aplikasi: role valid dan sudah disetujui.
 * PENDING (dan role tak dikenal) tidak bisa masuk.
 */
export function canUseApp(role: string): boolean {
  return (ACTIVE_ROLES as readonly string[]).includes(role)
}