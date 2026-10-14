import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canPostAnnouncement } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Params) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canPostAnnouncement)
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const db = createAdminClient()
    const patch: Record<string, unknown> = {}
    if (typeof body?.pinned === "boolean") {
      patch.pinned = body.pinned

      // Cek apakah announcement ini terhubung ke daily_briefs
      const { data: matchedBrief } = await db
        .from("daily_briefs")
        .select("id, kind")
        .eq("announcement_id", id)
        .eq("class_id", ctx.classId ?? "")
        .maybeSingle()

      if (matchedBrief) {
        // Sinkronkan status pinned ke record daily_briefs bersangkutan
        await db
          .from("daily_briefs")
          .update({ pinned: body.pinned })
          .eq("id", matchedBrief.id)

        // Jika dipin dan jenisnya DAILY, unpin daily brief lain di kelas ini
        if (body.pinned && matchedBrief.kind === "DAILY") {
          const { data: otherBriefs } = await db
            .from("daily_briefs")
            .select("id, announcement_id")
            .eq("class_id", ctx.classId ?? "")
            .eq("kind", "DAILY")
            .neq("id", matchedBrief.id)

          await db
            .from("daily_briefs")
            .update({ pinned: false })
            .eq("class_id", ctx.classId ?? "")
            .eq("kind", "DAILY")
            .neq("id", matchedBrief.id)

          const otherAnnIds = (otherBriefs ?? [])
            .map((b) => b.announcement_id)
            .filter(Boolean) as string[]

          if (otherAnnIds.length) {
            await db
              .from("announcements")
              .update({ pinned: false })
              .in("id", otherAnnIds)
              .eq("class_id", ctx.classId ?? "")
          }
        }
      }
    }
    if (typeof body?.title === "string") patch.title = body.title.trim()
    if (typeof body?.body === "string") patch.body = body.body.trim()
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan" }, { status: 400 })
    }
    const { data, error } = await db
      .from("announcements")
      .update(patch)
      .eq("id", id)
      .eq("class_id", ctx.classId ?? "")
      .select("*")
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: "Pengumuman tidak ditemukan" }, { status: 404 })
    return NextResponse.json(data)
  } catch (e) {
    return errorResponse(e)
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canPostAnnouncement)
    const { id } = await params
    const db = createAdminClient()
    const { data, error } = await db
      .from("announcements")
      .delete()
      .eq("id", id)
      .eq("class_id", ctx.classId ?? "")
      .select("id, title")
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: "Pengumuman tidak ditemukan" }, { status: 404 })

    // FK cascade (migration 016) sudah menghapus notif ber-ref_id.
    // Fallback untuk baris lama tanpa ref_id: cocokkan judul/body di aplikasi
    // (.PostgREST .or() rawan pecah kalau judul mengandung koma/karakter khusus).
    const title = (data.title || "").trim()
    const { data: candidates } = await db
      .from("notifications")
      .select("id, title, body, kind")
      .eq("class_id", ctx.classId ?? "")
      .eq("kind", "announcement")
      .is("ref_id", null)
    const orphanIds = (candidates ?? [])
      .filter((n) => {
        if (!title) return false
        if (n.title === title) return true
        return Boolean(n.body && n.body.includes(title))
      })
      .map((n) => n.id)
    if (orphanIds.length) {
      await db.from("notifications").delete().in("id", orphanIds)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return errorResponse(e)
  }
}
