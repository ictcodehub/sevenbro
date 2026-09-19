/** Tujuan navigasi notifikasi — SSOT untuk bell in-app + FCM status bar */
export function pathForNotification(
  kind?: string | null,
  title?: string | null,
  body?: string | null,
): string {
  const k = (kind ?? "").toLowerCase()
  const t = `${title ?? ""} ${body ?? ""}`.toLowerCase()

  if (k === "report" || k === "mass_report" || t.includes("mass report") || t.includes("vote")) {
    return "/app/poin?tab=report"
  }
  if (k === "roster" || k === "roster_proposal" || t.includes("usulan") || t.includes("roster")) {
    return "/app/admin/roster"
  }
  if (k === "announcement" || k === "info" || t.includes("pengumuman") || t.includes("brief") || t.includes("info kelas")) {
    return "/app/pengumuman"
  }
  if (k === "agenda" || t.includes("agenda")) return "/app/agenda"
  if (k === "kas" || t.includes("kas") || t.includes("iuran") || t.includes("setoran")) {
    return "/app/kas"
  }
  if (k === "poin" || t.includes("poin")) return "/app/poin"
  return "/app"
}
