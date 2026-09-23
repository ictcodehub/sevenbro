"use client"

import { SessionProvider } from "next-auth/react"

/**
 * Session auto-sync (hemat free tier):
 * - TANPA timer/polling — tidak ada request rutin yang membebani server.
 * - refetchOnWindowFocus: kartu role dicek saat user buka app lagi.
 *   DB-nya sendiri (auth.ts) hanya dicek max 1x/24 jam per user.
 * Ganti pengurus (mis. Bendahara baru) ikut otomatis — paling telat sehari,
 * dan server selalu validasi fresh per-request berapa pun kartunya.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider refetchOnWindowFocus>{children}</SessionProvider>
}
