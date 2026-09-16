"use client"

import { useSession, signOut } from "next-auth/react"
import { useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  CalendarDays,
  Home,
  Megaphone,
  Trophy,
  Wallet,
  Users,
  Shield,
  QrCode,
} from "lucide-react"
import AppShell from "@/components/AppShell"
import type { AppShellNotification } from "@/components/AppShell"
import { NOTIFICATIONS } from "@/lib/demo-data"

const READ_KEY = "sevenbro:read-notifications"

function loadRead(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    return new Set(JSON.parse(localStorage.getItem(READ_KEY) || "[]"))
  } catch {
    return new Set()
  }
}

function saveRead(ids: string[]) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify(ids))
  } catch {
    /* private mode — ignore */
  }
}

// Mapping role -> nav items
function getNavItems(role?: string) {
  const base = [
    { href: "/app", label: "Beranda", icon: Home },
    { href: "/app/pengumuman", label: "Info", icon: Megaphone },
    { href: "/app/agenda", label: "Agenda", icon: CalendarDays },
  ]

  if (role === "HOMEROOM" || role === "KETUA" || role === "SEKRETARIS" || role === "BENDAHARA") {
    const items = [...base, { href: "/app/poin", label: "Poin", icon: Trophy }]
    // Kas: hanya Homeroom & Bendahara
    if (role === "HOMEROOM" || role === "BENDAHARA") {
      items.splice(3, 0, { href: "/app/kas", label: "Kas", icon: Wallet })
    }
    return items
  }

  if (role === "TEACHER") {
    // Guru non-homeroom: hanya UI kasih poin — tanpa Beranda/Info/Arena
    return [{ href: "/app/scan", label: "Kasih Poin", icon: QrCode }]
  }

  return base
}

function getAdminItems(role?: string) {
  if (role === "HOMEROOM") {
    return [
      { href: "/app/admin/roster", label: "Roster", icon: Users },
      { href: "/app/admin/settings", label: "Pengaturan Kelas", icon: Shield },
    ]
  }
  return []
}

export default function ShellLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const [notifs, setNotifs] = useState<AppShellNotification[]>(NOTIFICATIONS)
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    setReadIds(loadRead())
  }, [])

  const withRead: AppShellNotification[] = notifs.map((n) => ({
    ...n,
    read: n.read || readIds.has(n.id),
  }))

  const markRead = (id: string) => {
    setNotifs((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    const next = new Set(readIds)
    next.add(id)
    setReadIds(next)
    saveRead([...next])
  }

  const role = (session?.user as { role?: string } | undefined)?.role
  const name = session?.user?.name || "Guru"
  const navItems = getNavItems(role)
  const adminItems = getAdminItems(role)

  // TEACHER: selalu dorong ke /app/scan (jangan mampir beranda/arena)
  useEffect(() => {
    if (role === "TEACHER" && pathname !== "/app/scan") {
      router.replace("/app/scan")
    }
  }, [role, pathname, router])

  return (
    <AppShell
      brand={{
        logoSrc: "/brand-logo.png",
        logoAlt: "Seven Bro!",
        title: "Seven Bro!",
      }}
      nav={{ items: navItems }}
      notifications={withRead}
      onNotificationClick={markRead}
      user={{ name }}
      onSettings={() => router.push("/app/settings")}
      onSignOut={() => {
        void signOut({ callbackUrl: "/login" })
      }}
      adminItems={adminItems}
    >
      {children}
    </AppShell>
  )
}
