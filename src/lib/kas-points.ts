import { createAdminClient } from "@/lib/db"

/**
 * @deprecated Auto-poin dari bayar kas telah DIHAPUS per keputusan produk 2026-10-14.
 * Fungsi ini dipertahankan hanya sebagai no-op yang selalu mengembalikan 0.
 */
export async function awardKasPoint(
  _db: ReturnType<typeof createAdminClient>,
  _studentIds: string[],
): Promise<number> {
  return 0
}

