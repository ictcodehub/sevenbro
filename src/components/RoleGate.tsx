"use client"

import { useSession } from "next-auth/react"
import { useEffect, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Shield } from "lucide-react"
import { EmptyState } from "@/components/ui-primitives"

/**
 * Gate role di client.
 * TEACHER: hanya boleh di /app/scan — selain itu di-redirect.
 * HOMEROOM: boleh semua.
 * Siswa: tidak boleh di halaman scan.
 */
export function RoleGate({
  children,
  allow,
  fallback = "redirect",
}: {
  children: ReactNode
  /** Role yang boleh melihat halaman ini */
  allow: string[]
  /** "redirect" → pindah ke tujuan default · "block" → tampilkan EmptyState */
  fallback?: "redirect" | "block"
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const role = (session?.user as { role?: string } | undefined)?.role

  useEffect(() => {
    if (status !== "authenticated" || !role) return
    if (allow.includes(role)) return

    if (fallback === "block") return

    if (role === "TEACHER") {
      router.replace("/app/scan")
      return
    }
    router.replace("/app")
  }, [status, role, allow, fallback, router, pathname])

  if (status === "loading") {
    return (
      <div className="px-4 py-3">
        <p className="text-[11px] text-ink-soft/75">Memuat…</p>
      </div>
    )
  }

  if (role && !allow.includes(role)) {
    if (fallback === "block" || role === "TEACHER") {
      return (
        <div className="px-4 py-3">
          <EmptyState
            icon={<Shield className="h-6 w-6" />}
            message={
              role === "TEACHER"
                ? "Akun guru hanya untuk Beri Poin"
                : "Anda tidak memiliki akses ke halaman ini"
            }
          />
        </div>
      )
    }
  }

  return <>{children}</>
}
