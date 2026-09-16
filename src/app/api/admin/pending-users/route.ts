import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canAdmin } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  ensureContextReader()
  try {
    await requireApi(canAdmin)
    const { data, error } = await createAdminClient()
      .from("users")
      .select("id, email, name, role")
      .eq("role", "PENDING")
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) throw new Error(error.message)
    return NextResponse.json(data ?? [])
  } catch (e) {
    return errorResponse(e)
  }
}
