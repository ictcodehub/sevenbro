import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

/** Daftarkan / update FCM token device yang login */
export async function POST(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi()
    const body = await req.json().catch(() => ({}))
    const fcmToken = String(body?.fcm_token ?? body?.token ?? "").trim()
    const platform = String(body?.platform ?? "android").trim() || "android"
    if (!fcmToken) {
      return NextResponse.json({ error: "fcm_token wajib" }, { status: 400 })
    }
    const email = (ctx.email || "").toLowerCase()
    if (!email) {
      return NextResponse.json({ error: "Email sesi tidak ada" }, { status: 400 })
    }
    const db = createAdminClient()
    // Satu token aktif per email+platform — cegah push dobel dari token lama
    await db
      .from("push_tokens")
      .delete()
      .eq("user_email", email)
      .eq("platform", platform)
      .neq("fcm_token", fcmToken)
    const { error } = await db.from("push_tokens").upsert(
      {
        class_id: ctx.classId ?? null,
        user_email: email,
        fcm_token: fcmToken,
        platform,
        user_agent: req.headers.get("user-agent") || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "fcm_token" },
    )
    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}

/** Hapus token device ini / semua token user login */
export async function DELETE(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi()
    const body = await req.json().catch(() => ({}))
    const fcmToken = String(body?.fcm_token ?? body?.token ?? "").trim()
    const email = (ctx.email || "").toLowerCase()
    const db = createAdminClient()
    if (fcmToken) {
      await db.from("push_tokens").delete().eq("fcm_token", fcmToken)
    } else if (email) {
      await db.from("push_tokens").delete().eq("user_email", email)
    }
    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
