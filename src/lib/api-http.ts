import { NextResponse } from "next/server"
import { ApiError, apiError } from "@/lib/session"

/** Format error → JSON response yang dimengerti fetcher (`{ error }`). */
export function errorResponse(err: unknown): NextResponse {
  const formatted = apiError(err)
  if (err instanceof ApiError) {
    return NextResponse.json(
      { error: formatted.message, code: formatted.code },
      { status: err.status },
    )
  }
  return NextResponse.json({ error: formatted.message }, { status: 500 })
}
