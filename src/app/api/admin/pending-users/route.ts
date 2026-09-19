import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canAdmin } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"
import { matchPendingToStudents } from "@/lib/pending-match"
import { formatDisplayName } from "@/lib/format"

export const dynamic = "force-dynamic"

type PendingOut = {
  id: string
  email: string
  name: string | null
  role: string
  suggested_student_id: string | null
  suggested_student_name: string | null
  match_reason: string | null
}

export async function GET() {
  ensureContextReader()
  try {
    const ctx = await requireApi(canAdmin)
    const db = createAdminClient()

    const { data: users, error } = await db
      .from("users")
      .select("id, email, name, role")
      .eq("role", "PENDING")
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)

    const { data: students } = await db
      .from("students")
      .select("id, full_name, email")
      .eq("class_id", ctx.classId ?? "")
      .eq("active", true)

    const autoLinked: { email: string; student_name: string }[] = []
    const remaining: PendingOut[] = []

    for (const u of users ?? []) {
      const match = matchPendingToStudents(u, students ?? [])
      if (match.auto) {
        const { error: sErr } = await db
          .from("students")
          .update({ email: (u.email || "").toLowerCase() })
          .eq("id", match.auto.id)
        if (sErr) throw new Error(sErr.message)
        await db.from("users").update({ role: "STUDENT" }).eq("id", u.id)
        autoLinked.push({
          email: u.email,
          student_name: formatDisplayName(match.auto.full_name),
        })
        continue
      }
      remaining.push({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        suggested_student_id: match.suggestion?.id ?? null,
        suggested_student_name: match.suggestion
          ? formatDisplayName(match.suggestion.full_name)
          : null,
        match_reason: match.suggestion ? match.reason : null,
      })
    }

    // Kompatibel lama: array; plus field autoLinked via envelope
    return NextResponse.json({ items: remaining, autoLinked })
  } catch (e) {
    return errorResponse(e)
  }
}
