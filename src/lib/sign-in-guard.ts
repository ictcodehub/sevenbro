import { createAdminClient } from "@/lib/db"
import { isSchoolEmail, normalizeEmail } from "@/lib/login-allowlist"

/**
 * Gate sign-in advanced security:
 * 1. Wajib email sekolah @mutiarabangsa.sch.id
 * 2. Harus salah satu: siswa aktif · teachers · homeroom · login_allowlist
 *
 * Fail closed: error DB / allowlist tidak dibuka untuk domain umum.
 */
export async function canSignInEmail(rawEmail: string | null | undefined): Promise<boolean> {
  const email = normalizeEmail(rawEmail)
  if (!isSchoolEmail(email)) return false

  try {
    const db = createAdminClient()

    const { data: student } = await db
      .from("students")
      .select("id")
      .eq("email", email)
      .eq("active", true)
      .maybeSingle()
    if (student) return true

    const { data: teacher } = await db
      .from("teachers")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle()
    if (teacher) return true

    const { data: cls } = await db
      .from("classes")
      .select("id")
      .eq("homeroom_email", email)
      .limit(1)
      .maybeSingle()
    if (cls) return true

    const { data: allowed, error: alErr } = await db
      .from("login_allowlist")
      .select("id")
      .eq("email", email)
      .maybeSingle()
    if (alErr) return false
    return Boolean(allowed)
  } catch {
    return false
  }
}
