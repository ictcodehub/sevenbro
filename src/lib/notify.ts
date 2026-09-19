// ============================================================
// Notifikasi server-side — aksi pengurus → Homeroom (dan sebaliknya)
// + FCM push (opsional, bila FCM_SERVER_KEY di-set)
// ============================================================

import { createAdminClient } from "@/lib/db"
import { formatDisplayName } from "@/lib/format"
import { pushConfigured, pushPathForKind, sendFcmPush } from "@/lib/push-fcm"

export type NotifyInput = {
  classId?: string | null
  title: string
  body: string
  kind?: string
  /** "HOMEROOM" atau email penerima */
  audience: string
  actorEmail?: string | null
  actorName?: string | null
  /** UUID sumber (announcement.id) — cascade delete saat Info dihapus */
  refId?: string | null
}

async function pushToAudience(
  classId: string | null | undefined,
  audience: string,
  opts: { title: string; body: string; kind?: string },
): Promise<void> {
  if (!pushConfigured() || !classId) return
  try {
    const db = createAdminClient()
    let emails: string[] = []
    if (audience === "HOMEROOM") {
      // Semua user HOMEROOM di kelas / global — fallback: token dengan class_id + role via users
      const { data: users } = await db
        .from("users")
        .select("email, role")
        .eq("role", "HOMEROOM")
      emails = (users ?? [])
        .map((u) => (u.email || "").toLowerCase())
        .filter(Boolean)
    } else {
      emails = [audience.toLowerCase()]
    }
    if (!emails.length) return
    const { data: rows } = await db
      .from("push_tokens")
      .select("fcm_token, user_email")
      .in("user_email", emails)
    const tokens = [...new Set((rows ?? []).map((r) => r.fcm_token).filter(Boolean))]
    if (!tokens.length) return
    await sendFcmPush(tokens, {
      title: opts.title,
      body: opts.body,
      kind: opts.kind,
      path: pushPathForKind(opts.kind, opts.title, opts.body),
    })
  } catch {
    /* silent */
  }
}

/**
 * Simpan notifikasi. Gagal silent — UI utama tidak boleh putus
 * hanya karena notif tidak tersimpan.
 */
export async function createClassNotification(input: NotifyInput): Promise<void> {
  try {
    if (!input.classId) return
    const db = createAdminClient()
    const { error } = await db.from("notifications").insert({
      class_id: input.classId,
      title: input.title,
      body: input.body,
      kind: input.kind ?? null,
      audience: input.audience,
      actor_email: input.actorEmail ? input.actorEmail.toLowerCase() : null,
      actor_name: input.actorName ? formatDisplayName(input.actorName) : null,
      ref_id: input.refId ?? null,
    })
    if (error) throw new Error(error.message)
    void pushToAudience(input.classId, input.audience, {
      title: input.title,
      body: input.body,
      kind: input.kind,
    })
  } catch {
    /* jangan gagalkan aksi utama */
  }
}

/** Email siswa aktif kelas + email Homeroom/teacher terdaftar */
async function classMemberEmails(classId: string): Promise<string[]> {
  const db = createAdminClient()
  const emails = new Set<string>()
  const { data: studs } = await db
    .from("students")
    .select("email, active")
    .eq("class_id", classId)
  for (const s of studs ?? []) {
    const e = (s.email || "").toLowerCase()
    if (e && s.active !== false) emails.add(e)
  }
  const { data: teachers } = await db
    .from("teachers")
    .select("email")
    .eq("class_id", classId)
  for (const t of teachers ?? []) {
    const e = (t.email || "").toLowerCase()
    if (e) emails.add(e)
  }
  return [...emails]
}

/**
 * Broadcast Info kelas ke SEMUA anggota (1 baris per email + 1 push per token).
 * Jangan double-insert audience HOMEROOM — wali kelas ikut lewat emailnya.
 */
export async function notifyClassBroadcast(
  ctx: { classId?: string; email?: string; name?: string; role?: string },
  opts: { title: string; body: string; kind?: string; refId?: string | null },
): Promise<void> {
  if (!ctx.classId) return
  const db = createAdminClient()
  const emails = new Set(await classMemberEmails(ctx.classId))
  try {
    const { data: cls } = await db
      .from("classes")
      .select("homeroom_email")
      .eq("id", ctx.classId)
      .maybeSingle()
    const h = (cls?.homeroom_email || "").toLowerCase()
    if (h) emails.add(h)
  } catch {
    /* optional */
  }
  const list = [...emails]
  if (!list.length) return
  await notifyEmails(ctx, list, opts)
}

/** Notif ke Homeroom (audience = HOMEROOM) */
export async function notifyHomeroom(
  ctx: { classId?: string; email?: string; name?: string; role?: string },
  opts: { title: string; body: string; kind?: string },
): Promise<void> {
  if (ctx.role === "HOMEROOM") return
  await createClassNotification({
    classId: ctx.classId,
    title: opts.title,
    body: opts.body,
    kind: opts.kind,
    audience: "HOMEROOM",
    actorEmail: ctx.email,
    actorName: ctx.name,
  })
}

/** Notif ke satu email */
export async function notifyEmail(
  ctx: { classId?: string; email?: string; name?: string },
  recipientEmail: string,
  opts: { title: string; body: string; kind?: string },
): Promise<void> {
  if (!recipientEmail) return
  await createClassNotification({
    classId: ctx.classId,
    title: opts.title,
    body: opts.body,
    kind: opts.kind,
    audience: recipientEmail.toLowerCase(),
    actorEmail: ctx.email,
    actorName: ctx.name,
  })
}

/** Notif broadcast ke banyak email */
export async function notifyEmails(
  ctx: { classId?: string; email?: string; name?: string },
  recipients: string[],
  opts: { title: string; body: string; kind?: string; refId?: string | null },
): Promise<void> {
  const emails = [...new Set(recipients.map((e) => e.toLowerCase()).filter(Boolean))]
  if (emails.length === 0 || !ctx.classId) return
  try {
    const db = createAdminClient()
    const rows = emails.map((audience) => ({
      class_id: ctx.classId,
      title: opts.title,
      body: opts.body,
      kind: opts.kind ?? null,
      audience,
      actor_email: ctx.email ? ctx.email.toLowerCase() : null,
      actor_name: ctx.name ? formatDisplayName(ctx.name) : null,
      ref_id: opts.refId ?? null,
    }))
    const { error } = await db.from("notifications").insert(rows)
    if (error) throw new Error(error.message)
    void (async () => {
      const { data: tokens } = await db
        .from("push_tokens")
        .select("fcm_token")
        .in("user_email", emails)
      const list = (tokens ?? []).map((t) => t.fcm_token).filter(Boolean)
      if (list.length) {
        await sendFcmPush(list, {
          title: opts.title,
          body: opts.body,
          kind: opts.kind,
          path: pushPathForKind(opts.kind, opts.title, opts.body),
        })
      }
    })()
  } catch {
    /* silent */
  }
}
