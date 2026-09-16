import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canGivePoints } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi()
    const db = createAdminClient()
    const url = new URL(req.url)
    const studentIdParam = url.searchParams.get("studentId")

    const { data: leaderboard, error } = await db
      .from("student_points_total")
      .select("*")
      .eq("class_id", ctx.classId ?? "")
      .order("total_points", { ascending: false })
    if (error) throw new Error(error.message)

    // Histori untuk satu siswa (detail) — semua role aktif boleh lihat alasan
    if (studentIdParam) {
      const { data: history, error: hErr } = await db
        .from("points")
        .select("id, kind, delta, reason, created_by, created_at")
        .eq("student_id", studentIdParam)
        .order("created_at", { ascending: false })
        .limit(50)
      if (hErr) throw new Error(hErr.message)
      const student = (leaderboard ?? []).find((r) => r.student_id === studentIdParam)
      return NextResponse.json({
        student: student ?? null,
        history: history ?? [],
      })
    }

    // Default: riwayat kelas terbaru (campuran semua siswa)
    const { data: recentRows, error: rErr } = await db
      .from("points")
      .select("id, kind, delta, reason, created_by, created_at, student_id")
      .order("created_at", { ascending: false })
      .limit(30)
    if (rErr) throw new Error(rErr.message)

    // Attach nama siswa tanpa nested join (lebih aman di view)
    const nameById = new Map<string, string>()
    for (const row of leaderboard ?? []) {
      nameById.set(row.student_id, row.full_name)
    }
    const missing = [...new Set((recentRows ?? []).map((r) => r.student_id))].filter(
      (id) => !nameById.has(id),
    )
    if (missing.length > 0) {
      const { data: more } = await db
        .from("students")
        .select("id, full_name")
        .in("id", missing)
      for (const s of more ?? []) nameById.set(s.id, s.full_name)
    }
    const recent = (recentRows ?? []).map((r) => ({
      ...r,
      student: r.student_id
        ? { id: r.student_id, full_name: nameById.get(r.student_id) ?? "Siswa" }
        : null,
    }))

    let myHistory: unknown[] = []
    if (ctx.studentId) {
      const { data } = await db
        .from("points")
        .select("id, kind, delta, reason, created_by, created_at")
        .eq("student_id", ctx.studentId)
        .order("created_at", { ascending: false })
        .limit(20)
      myHistory = data ?? []
    }

    return NextResponse.json({
      leaderboard: leaderboard ?? [],
      recent,
      history: myHistory,
      studentId: ctx.studentId,
    })
  } catch (e) {
    return errorResponse(e)
  }
}

export async function POST(req: Request) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canGivePoints)
    const body = await req.json().catch(() => ({}))
    const studentId = String(body?.studentId ?? "").trim()
    const kind = String(body?.kind ?? "").toUpperCase()
    const reason = String(body?.reason ?? "").trim()
    const abs = Math.abs(Number(body?.delta))
    if (!studentId || !reason) {
      return NextResponse.json({ error: "Siswa dan alasan wajib diisi" }, { status: 400 })
    }
    if (kind !== "PRESTASI" && kind !== "PELANGGARAN") {
      return NextResponse.json({ error: "Jenis harus PRESTASI atau PELANGGARAN" }, { status: 400 })
    }
    if (!Number.isFinite(abs) || abs < 1 || abs > 100) {
      return NextResponse.json({ error: "Poin harus 1–100" }, { status: 400 })
    }
    const delta = kind === "PRESTASI" ? Math.round(abs) : -Math.round(abs)
    const { data, error } = await createAdminClient()
      .from("points")
      .insert({
        student_id: studentId,
        kind,
        delta,
        reason,
        created_by: ctx.email ?? ctx.name,
      })
      .select("*")
      .single()
    if (error) throw new Error(error.message)
    return NextResponse.json(data, { status: 201 })
  } catch (e) {
    return errorResponse(e)
  }
}
