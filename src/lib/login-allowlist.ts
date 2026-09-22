export const SCHOOL_DOMAIN = "@mutiarabangsa.sch.id"

/** Normalisasi email untuk cek whitelist / login. */
export function normalizeEmail(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase()
}

export function isSchoolEmail(email: string | null | undefined): boolean {
  return normalizeEmail(email).endsWith(SCHOOL_DOMAIN)
}
