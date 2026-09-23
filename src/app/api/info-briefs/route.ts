import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canPostAnnouncement, canUseApp } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"
import { notifyClassBroadcast } from "@/lib/notify"
import { formatDisplayName } from "@/lib/format"
import {
  greetingForBrief,
  briefTitleForDate,
  dateKeyWIB,
  formatBriefDateLong,
  generateBriefBody,
  isSchoolDay,
  relativeDayLabel,
  tomorrowKeyWIB,
  type BriefPayload,
} from "@/lib/info-brief"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canUseApp)
    if (!ctx.classId) return NextResponse.json([])
    const url = new URL(req.url)
    const date = url.searchParams.get("date")
    const limit = Number(url.searchParams.get("limit") || 30)
    let q = createAdminClient()
      .from("daily_briefs")
      .select("*")
      .eq("class_id", ctx.classId)
      .order("date", { ascending: false })
      .limit(Number.isFinite(limit) && limit > 0 ? Math.min(limit, 90) : 30)
    if (date) q = q.eq("date", date)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    return NextResponse.json(data ?? [])
  } catch (e) {
    return errorResponse(e)
  }
}

function normalizePayload(raw: unknown): BriefPayload {
  const p = (raw && typeof raw === "object" ? raw : {}) as BriefPayload
  return {
    subjects: Array.isArray(p.subjects) ? p.subjects : [],
    duties: Array.isArray(p.duties) ? p.duties : [],
    items: Array.isArray(p.items) ? p.items : [],
  }
}

export async function POST(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canPostAnnouncement)
    if (!ctx.classId) {
      return NextResponse.json({ error: "Kelas belum terkonfigurasi" }, { status: 400 })
    }
    const body = await req.json().catch(() => ({}))
    const kind = body?.kind === "GENERAL" ? "GENERAL" : "DAILY"
    const dateKey =
      kind === "DAILY"
        ? String(body?.date || tomorrowKeyWIB()).slice(0, 10)
        : dateKeyWIB(new Date())
    if (kind === "DAILY" && !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      return NextResponse.json({ error: "Tanggal brief tidak valid" }, { status: 400 })
    }
    if (kind === "DAILY" && !isSchoolDay(dateKey)) {
      return NextResponse.json(
        { error: "Sabtu/Minggu libur. Brief hanya Senin-Jumat." },
        { status: 400 },
      )
    }

    const greeting =
      String(body?.greeting ?? "").trim() || greetingForBrief(dateKey)
    const uniform = String(body?.uniform ?? "").trim() || null
    const uniformNote = String(body?.uniform_note ?? "").trim() || null
    const pinned = Boolean(body?.pinned)
    const payload = normalizePayload(body?.payload)
    const title =
      kind === "DAILY" ? briefTitleForDate(dateKey) : String(body?.title ?? "").trim() || "Info Kelas"
    const freeBody = String(body?.body ?? "").trim()

    const db = createAdminClient()
    const { count: rosterSize } = await db
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("class_id", ctx.classId)
      .eq("active", true)

    const bodyGenerated =
      kind === "DAILY"
        ? generateBriefBody({
            dateKey,
            greeting,
            uniform,
            uniform_note: uniformNote,
            subjects: payload.subjects,
            duties: payload.duties,
            items: payload.items,
            rosterSize: rosterSize ?? undefined,
          })
        : freeBody || title

    if (kind === "GENERAL" && !freeBody) {
      return NextResponse.json({ error: "Isi pengumuman wajib diisi" }, { status: 400 })
    }

    const author = formatDisplayName(ctx.name) || ctx.email || "Pengurus"

    // 1 brief DAILY per tanggal — update bila sudah ada
    const { data: existing, error: exErr } = await db
      .from("daily_briefs")
      .select("id, announcement_id")
      .eq("class_id", ctx.classId)
      .eq("date", dateKey)
      .eq("kind", kind)
      .maybeSingle()
    if (exErr) throw new Error(exErr.message)

    let announcementId: string | null = existing?.announcement_id ?? null
    const annPayload = {
      title,
      body: bodyGenerated,
      pinned,
    }

    if (announcementId) {
      const { error: upAnn } = await db
        .from("announcements")
        .update(annPayload)
        .eq("id", announcementId)
        .eq("class_id", ctx.classId)
      if (upAnn) throw new Error(upAnn.message)
    } else {
      const { data: ann, error: insAnn } = await db
        .from("announcements")
        .insert({
          class_id: ctx.classId,
          ...annPayload,
          created_by: ctx.name ?? ctx.email,
        })
        .select("id")
        .single()
      if (insAnn) throw new Error(insAnn.message)
      announcementId = ann?.id ?? null
    }

    const row = {
      class_id: ctx.classId,
      date: dateKey,
      kind,
      title,
      greeting,
      uniform,
      uniform_note: uniformNote,
      pinned,
      payload,
      body_generated: bodyGenerated,
      announcement_id: announcementId,
      created_by: ctx.email ?? ctx.name,
      created_by_name: author,
      updated_at: new Date().toISOString(),
    }

    let brief
    if (existing?.id) {
      const { data, error } = await db
        .from("daily_briefs")
        .update(row)
        .eq("id", existing.id)
        .select("*")
        .single()
      if (error) throw new Error(error.message)
      brief = data
    } else {
      const { data, error } = await db
        .from("daily_briefs")
        .insert(row)
        .select("*")
        .single()
      if (error) throw new Error(error.message)
      brief = data
    }

    const rel = relativeDayLabel(dateKey)
    const longDate = formatBriefDateLong(dateKey)
    const notifBody =
      kind === "DAILY"
        ? `${author} memposting brief ${rel ? rel.toLowerCase() + " " : ""}(${longDate}).`
        : `${author} memposting “${title}”.`

    await notifyClassBroadcast(ctx, {
      title: title,
      body: notifBody,
      kind: "announcement",
      refId: announcementId,
    })

    return NextResponse.json(brief, { status: existing ? 200 : 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
