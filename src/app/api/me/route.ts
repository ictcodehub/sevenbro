import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"

export const dynamic = "force-dynamic"

export async function GET() {
  ensureContextReader()
  try {
    const ctx = await requireApi()
    return NextResponse.json(ctx)
  } catch (e) {
    return errorResponse(e)
  }
}
