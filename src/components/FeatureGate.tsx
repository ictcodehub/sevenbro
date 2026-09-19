"use client"

import { type ReactNode } from "react"
import { useSession } from "next-auth/react"
import { Megaphone } from "lucide-react"
import { EmptyState } from "@/components/ui-primitives"
import { useAppSWR } from "@/lib/fetcher"
import {
  featureVisibleToStudent,
  type ClassSettings,
} from "@/lib/class-settings"

/**
 * Gate menu berdasarkan class_settings.
 * Homeroom/manager selalu lolos; murid lihat empty state bila fitur nonaktif.
 */
export default function FeatureGate({
  feature,
  label,
  children,
}: {
  feature: keyof ClassSettings
  label?: string
  children: ReactNode
}) {
  const { data: session } = useSession()
  const role = (session?.user as { role?: string } | undefined)?.role
  const { data: flags } = useAppSWR<ClassSettings>("/api/class-settings")

  if (featureVisibleToStudent(feature, flags, role)) {
    return <>{children}</>
  }

  return (
    <div className="px-4 py-6">
      <EmptyState
        icon={<Megaphone className="h-6 w-6" />}
        message={`${label || "Fitur"} sedang dinonaktifkan untuk murid`}
      />
    </div>
  )
}
