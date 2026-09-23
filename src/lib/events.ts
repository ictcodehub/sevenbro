/** Agenda selesai: tanpa ends_at → lewat starts_at; multi-day → lewat ends_at */
export function isEventPast(
  startsAt: string,
  endsAt: string | null | undefined,
  nowMs: number = Date.now(),
): boolean {
  if (endsAt) return +new Date(endsAt) < nowMs
  return +new Date(startsAt) < nowMs
}
