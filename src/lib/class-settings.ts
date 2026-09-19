// Toggle fitur kelas — client helper
export type ClassSettings = {
  kas_enabled: boolean
  agenda_enabled: boolean
  poin_enabled: boolean
  info_enabled: boolean
}

export const DEFAULT_CLASS_SETTINGS: ClassSettings = {
  kas_enabled: true,
  agenda_enabled: true,
  poin_enabled: true,
  info_enabled: true,
}

export function isManagerRole(role?: string | null): boolean {
  return role === "HOMEROOM" || role === "TEACHER"
}

/** Menu murid aktif? Manager (Homeroom) selalu boleh manage */
export function featureVisibleToStudent(
  feature: keyof ClassSettings,
  settings: ClassSettings | null | undefined,
  role?: string | null,
): boolean {
  if (isManagerRole(role)) return true
  if (!settings) return true
  return settings[feature] !== false
}
