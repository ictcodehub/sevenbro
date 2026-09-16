// ============================================================
// Context reader server-side — pasang sekali, dipakai semua route handler
// via ensureContextReader() sebelum requireApi().
// ============================================================

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { createAdminClient } from "@/lib/db"
import { setContextReader, type AppContext } from "@/lib/session"
import { resolveEffectiveRole } from "@/lib/roles"

let installed = false

export function ensureContextReader(): void {
  if (installed) return
  installed = true

  setContextReader(async (): Promise<AppContext | null> => {
    const session = await getServerSession(authOptions)
    const email = session?.user?.email
    if (!email) return null

    const db = createAdminClient()
    const { data: userRow } = await db
      .from("users")
      .select("id, name, role")
      .eq("email", email)
      .maybeSingle()

    let usersRole: string | null = userRow?.role ?? null
    let studentPosition: string | null = null
    let classId: string | null = null
    let studentId: string | null = null
    let className: string | null = null

    // STUDENT / PENDING / belum ada role → cek apakah email cocok roster aktif
    if (usersRole === "STUDENT" || usersRole === "PENDING" || !usersRole) {
      const { data: student } = await db
        .from("students")
        .select("id, class_id, position, full_name, classes(name)")
        .eq("email", email)
        .eq("active", true)
        .maybeSingle()
      if (student) {
        studentId = student.id
        classId = student.class_id
        studentPosition = student.position
        const cls = student.classes as { name?: string } | { name?: string }[] | null
        className = Array.isArray(cls) ? (cls[0]?.name ?? null) : (cls?.name ?? null)
        // PENDING yang cocok roster → perlakukan STUDENT untuk resolve
        if (usersRole === "PENDING" || !usersRole) {
          usersRole = "STUDENT"
        }
      }
    }

    if (usersRole === "HOMEROOM") {
      const { data: cls } = await db
        .from("classes")
        .select("id, name")
        .eq("homeroom_email", email)
        .maybeSingle()
      classId = cls?.id ?? null
      className = cls?.name ?? null
    }

    if (usersRole === "TEACHER") {
      const { data: t } = await db
        .from("teachers")
        .select("class_id, classes(name)")
        .eq("email", email)
        .maybeSingle()
      if (t) {
        classId = t.class_id
        const cls = t.classes as { name?: string } | { name?: string }[] | null
        className = Array.isArray(cls) ? (cls[0]?.name ?? null) : (cls?.name ?? null)
      }
    }

    return {
      role: resolveEffectiveRole(usersRole, studentPosition),
      name: userRow?.name ?? session?.user?.name ?? "Pengguna",
      email,
      classId: classId ?? undefined,
      className: className ?? undefined,
      studentId,
    }
  })
}
