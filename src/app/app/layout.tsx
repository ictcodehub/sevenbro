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
  Flag,
} from "lucide-react"
import AppShell from "@/components/AppShell"
import type { AppShellNotification } from "@/components/AppShell"
import {
  DELETED_KEY,
  NOTIF_EVENT,
  READ_KEY,
  loadIdSet,
  saveIdSet,
} from "@/lib/notifications-store"
import { formatRoleLabel } from "@/lib/roles"
import { formatDisplayName } from "@/lib/format"
import { clearSwrCache } from "@/lib/swr-store"
import { pathForNotification } from "@/lib/notif-nav"

function loadRead(): Set<string> {
  return loadIdSet(READ_KEY)
}

function saveRead(ids: string[]) {
  saveIdSet(READ_KEY, ids)
}

function loadDeleted(): Set<string> {
  return loadIdSet(DELETED_KEY)
}

function saveDeleted(ids: string[]) {
  saveIdSet(DELETED_KEY, ids)
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ""
  const diff = Math.max(0, Date.now() - t)
  const m = Math.floor(diff / 60000)
  if (m < 1) return "Baru saja"
  if (m < 60) return `${m} menit lalu`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} jam lalu`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} hari lalu`
  return new Date(t).toLocaleDateString("id-ID", { day: "numeric", month: "short" })
}

type ApiNotif = {
  id: string
  title: string
  body: string
  kind: string | null
  actor: string | null
  created_at: string
}

// Mapping role -> nav items
// Siswa aktif (termasuk ANGGOTA) dapat Kas + Poin; manage beda di dalam halaman
// Info & Agenda: aktif hanya HOMEROOM; murid lihat disabled sampai dibuka lagi
const STUDENT_NAV_ROLES = ["HOMEROOM", "KETUA", "BENDAHARA", "SEKRETARIS", "ANGGOTA"]

function getNavItems(role?: string) {
  const isHomeroom = role === "HOMEROOM"
  const base = [
    { href: "/app", label: "Beranda", icon: Home },
    {
      href: "/app/pengumuman",
      label: "Info",
      icon: Megaphone,
      disabled: !isHomeroom,
    },
    {
      href: "/app/agenda",
      label: "Agenda",
      icon: CalendarDays,
      disabled: !isHomeroom,
    },
  ]

  if (role && STUDENT_NAV_ROLES.includes(role)) {
    return [
      ...base,
      { href: "/app/kas", label: "Kas", icon: Wallet },
      { href: "/app/poin", label: "Poin", icon: Trophy },
    ]
  }

  if (role === "TEACHER") {
    return [{ href: "/app/scan", label: "Beri Poin", icon: QrCode }]
  }

  return base.map((item) => ({ ...item, disabled: true as const }))
}

function getAdminItems(role?: string) {
  if (role === "HOMEROOM") {
    return [
      { href: "/app/admin/roster", label: "Roster", icon: Users },
      { href: "/app/admin/settings", label: "Pengaturan Kelas", icon: Shield },
    ]
  }
  if (role === "KETUA") {
    return [
      { href: "/app/admin/roster", label: "Roster", icon: Users },
      { href: "/app/report/new", label: "Buat Report", icon: Flag },
    ]
  }
  return []
}

export default function ShellLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const [notifs, setNotifs] = useState<AppShellNotification[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())
  const [deletedIds, setDeletedIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    const sync = () => {
      setReadIds(loadRead())
      setDeletedIds(loadDeleted())
    }
    sync()
    window.addEventListener(NOTIF_EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(NOTIF_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  // Muat notifikasi server (aksi pengurus → Homeroom, dll.)
  useEffect(() => {
    let cancelled = false
    const loadNotifs = async () => {
      try {
        const r = await fetch("/api/notifications", { headers: { Accept: "application/json" } })
        if (!r.ok) return
        const rows = (await r.json()) as ApiNotif[]
        if (cancelled || !Array.isArray(rows)) return
        setNotifs(
          rows.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            kind: n.kind,
            time: timeAgo(n.created_at),
            read: false,
          })),
        )
      } catch {
        /* offline / belum login */
      }
    }
    void loadNotifs()
    const onFocus = () => void loadNotifs()
    window.addEventListener("focus", onFocus)
    return () => {
      cancelled = true
      window.removeEventListener("focus", onFocus)
    }
  }, [session?.user?.email, (session?.user as { role?: string } | undefined)?.role])

  const withRead: AppShellNotification[] = notifs
    .filter((n) => !deletedIds.has(n.id))
    .map((n) => ({
      ...n,
      read: n.read || readIds.has(n.id),
    }))

  const openNotif = (id: string) => {
    const n = notifs.find((x) => x.id === id)
    // Hapus dari shade (hilang permanen dari tampilan aktif)
    setDeletedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveDeleted([...next])
      return next
    })
    setNotifs((prev) => prev.filter((x) => x.id !== id))

    const to = pathForNotification(n?.kind, n?.title, n?.body)
    if (role === "TEACHER") {
      router.replace("/app/scan")
      return
    }
    router.push(to)
  }

  const deleteNotif = (id: string) => {
    setDeletedIds((prev) => {
      const next = new Set(prev)
      next.add(id)
      saveDeleted([...next])
      return next
    })
  }

  const clearAllNotifs = () => {
    const all = withRead.map((n) => n.id)
    setDeletedIds((prev) => {
      const next = new Set([...prev, ...all])
      saveDeleted([...next])
      return next
    })
  }

  const role = (session?.user as { role?: string } | undefined)?.role
  const name = formatDisplayName(session?.user?.name) || "Guru"
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
        title: "Seven Bro",
      }}
      nav={{ items: navItems }}
      notifications={withRead}
      onNotificationClick={openNotif}
      onNotificationDelete={deleteNotif}
      onClearAllNotifications={clearAllNotifs}
      user={{ name, role: formatRoleLabel(role) }}
      onSettings={() => router.push("/app/settings")}
      onViewHistory={() => router.push("/app/notifications")}
      onSignOut={() => {
        clearSwrCache()
        void signOut({ callbackUrl: "/login" })
      }}
      adminItems={adminItems}
    >
      {children}
    </AppShell>
  )
}
