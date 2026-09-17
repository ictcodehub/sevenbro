import { NextResponse } from "next/server"
import { errorResponse } from "@/lib/api-http"
import { canVoteMassReport } from "@/lib/policies"
import { requireApi } from "@/lib/session"
import { ensureContextReader } from "@/lib/server-context"
import { createAdminClient } from "@/lib/db"

export const dynamic = "force-dynamic"

type Params = { params: Promise<{ id: string }> }

/** Foto bukti mass report — hanya siswa kelas yang vote/review boleh akses */
export async function GET(_req: Request, { params }: Params) {
  ensureContextReader()
  try {
    const ctx = await requireApi(canVoteMassReport)
    const { id } = await params
    const { data, error } = await createAdminClient()
      .from("mass_reports")
      .select("id, photo_data, photo_mime")
      .eq("id", id)
      .eq("class_id", ctx.classId ?? "")
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data?.photo_data) {
      return NextResponse.json({ error: "Tidak ada foto" }, { status: 404 })
    }
    return NextResponse.json({
      mime: data.photo_mime || "image/jpeg",
      data: data.photo_data,
    })
  } catch (e) {
    return errorResponse(e)
  }
}
