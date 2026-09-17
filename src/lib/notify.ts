// ============================================================
// Notifikasi server-side — aksi pengurus → Homeroom (dan sebaliknya)
// ============================================================

import { createAdminClient } from "@/lib/db"
import { formatDisplayName } from "@/lib/format"

export type NotifyInput = {
  classId?: string | null
  title: string
  body: string
  kind?: string
  /** "HOMEROOM" atau email penerima */
  audience: string
  actorEmail?: string | null
  actorName?: string | null
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
    })
    if (error) throw new Error(error.message)
  } catch {
    /* jangan gagalkan aksi utama */
  }
}

/** Notif ke Homeroom (audience = HOMEROOM) */
export async function notifyHomeroom(
  ctx: { classId?: string; email?: string; name?: string; role?: string },
  opts: { title: string; body: string; kind?: string },
): Promise<void> {
  // Aksi Homeroom sendiri tidak perlu notif ke dirinya
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

/** Notif ke satu email (mis. Ketua saat usulan diproses) */
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

/** Notif broadcast ke banyak email sekaligus */
export async function notifyEmails(
  ctx: { classId?: string; email?: string; name?: string },
  recipients: string[],
  opts: { title: string; body: string; kind?: string },
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
    }))
    const { error } = await db.from("notifications").insert(rows)
    if (error) throw new Error(error.message)
  } catch {
    /* silent */
  }
}
