import { createAdminClient } from "@/lib/db"

/**
 * A1 — auto +1 poin "Bayar Uang Kas" saat setoran tercatat.
 * SSOT docs/POINT_SYSTEM.md: maksimal 1× per siswa per hari.
 *
 * Dipakai dua jalur setoran supaya aturannya tidak beda-beda:
 * - /api/kas/collect      → setoran harian (checklist)
 * - /api/kas/transactions → Bayar Khusus (nominal bebas)
 *
 * Return: jumlah siswa yang benar-benar mendapat poin.
 */
export async function awardKasPoint(
  db: ReturnType<typeof createAdminClient>,
  studentIds: string[],
): Promise<number> {
  if (studentIds.length === 0) return 0

  const nowYmd = new Date().toISOString().slice(0, 10)
  const todayStart = new Date(`${nowYmd}T00:00:00Z`).toISOString()

  const { data: already } = await db
    .from("points")
    .select("student_id")
    .in("student_id", studentIds)
    .eq("reason", "Bayar Uang Kas")
    .gte("created_at", todayStart)

  const gotToday = new Set((already ?? []).map((p: { student_id: string }) => p.student_id))
  const toPoint = studentIds.filter((id) => !gotToday.has(id))
  if (toPoint.length === 0) return 0

  const { error } = await db.from("points").insert(
    toPoint.map((student_id) => ({
      student_id,
      kind: "PRESTASI",
      delta: 1,
      reason: "Bayar Uang Kas",
      created_by: "system@mutiarabangsa.sch.id",
    })),
  )
  if (error) {
    console.warn("kas points:", error.message)
    return 0
  }
  return toPoint.length
}
