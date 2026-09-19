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
  NOTIF_EVENT,
  READ_KEY,
  loadIdSet,
  migrateLocalDeletedToServer,
  saveIdSet,
} from "@/lib/notifications-store"
import { formatRoleLabel } from "@/lib/roles"
import { formatDisplayName } from "@/lib/format"
import { clearSwrCache } from "@/lib/swr-store"
import { pathForNotification } from "@/lib/notif-nav"
import { useAppSWR } from "@/lib/fetcher"
import type { ClassSettings } from "@/lib/class-settings"
import { useFcmTokenRegister } from "@/lib/push-client"

function loadRead(): Set<string> {
  return loadIdSet(READ_KEY)
}

function saveRead(ids: string[]) {
  saveIdSet(READ_KEY, ids)
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
  deleted_at?: string | null
}

type ShadeNotif = AppShellNotification & { kind: string | null }

// Mapping role -> nav items
// Siswa aktif dapat menu sesuai class_settings; manage beda di dalam halaman
const STUDENT_NAV_ROLES = ["HOMEROOM", "KETUA", "BENDAHARA", "SEKRETARIS", "ANGGOTA"]
const MANAGER_NAV = new Set(["HOMEROOM"])

function getNavItems(
  role?: string,
  flags?: {
    info_enabled?: boolean
    agenda_enabled?: boolean
    kas_enabled?: boolean
    poin_enabled?: boolean
  } | null,
) {
  const isManager = role ? MANAGER_NAV.has(role) : false
  const on = (key: keyof NonNullable<typeof flags>) =>
    isManager || !flags || flags[key] !== false

  const base = [
    { href: "/app", label: "Beranda", icon: Home },
    {
      href: "/app/pengumuman",
      label: "Info",
      icon: Megaphone,
      disabled: !on("info_enabled"),
    },
    {
      href: "/app/agenda",
      label: "Agenda",
      icon: CalendarDays,
      disabled: !on("agenda_enabled"),
    },
  ]

  if (role && STUDENT_NAV_ROLES.includes(role)) {
    return [
      ...base,
      {
        href: "/app/kas",
        label: "Kas",
        icon: Wallet,
        disabled: !on("kas_enabled"),
      },
      {
        href: "/app/poin",
        label: "Poin",
        icon: Trophy,
        disabled: !on("poin_enabled"),
      },
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
  const { data: classFlags } = useAppSWR<ClassSettings>("/api/class-settings")
  useFcmTokenRegister(Boolean(session))
  const [notifs, setNotifs] = useState<ShadeNotif[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    const sync = () => setReadIds(loadRead())
    sync()
    window.addEventListener(NOTIF_EVENT, sync)
    window.addEventListener("storage", sync)
    return () => {
      window.removeEventListener(NOTIF_EVENT, sync)
      window.removeEventListener("storage", sync)
    }
  }, [])

  // Muat notifikasi server (aksi pengurus → Homeroom, dll.)
  // Sumber kebenaran hapus = kolom deleted_at di server (install ulang tidak reset)
  useEffect(() => {
    let cancelled = false
    const loadNotifs = async () => {
      try {
        // Legacy: dorong hapus lama (localStorage-only) ke server sekali
        await migrateLocalDeletedToServer()
        const r = await fetch("/api/notifications", { headers: { Accept: "application/json" } })
        if (!r.ok) return
        const rows = (await r.json()) as ApiNotif[]
        if (cancelled || !Array.isArray(rows)) return
        setNotifs(
          rows
            .filter((n) => !n.deleted_at)
            .map((n) => ({
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

  const withRead: AppShellNotification[] = notifs.map((n) => ({
    ...n,
    read: n.read || readIds.has(n.id),
  }))

  const openNotif = (id: string) => {
    const n = notifs.find((x) => x.id === id)
    setNotifs((prev) => prev.filter((x) => x.id !== id))
    void fetch(`/api/notifications/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {})

    const to = pathForNotification(n?.kind, n?.title, n?.body)
    if (role === "TEACHER") {
      router.replace("/app/scan")
      return
    }
    router.push(to)
  }

  const deleteNotif = (id: string) => {
    setNotifs((prev) => prev.filter((x) => x.id !== id))
    // Soft-delete permanen di server — install ulang tidak memunculkan lagi
    void fetch(`/api/notifications/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {})
  }

  const clearAllNotifs = () => {
    const all = withRead.map((n) => n.id)
    setNotifs((prev) => prev.filter((x) => !all.includes(x.id)))
    void fetch("/api/notifications/clear", { method: "DELETE" }).catch(() => {})
  }

  const role = (session?.user as { role?: string } | undefined)?.role
  const name = formatDisplayName(session?.user?.name) || "Guru"
  const navItems = getNavItems(role, classFlags)
  const adminItems = getAdminItems(role)

  const [openShade, setOpenShade] = useState(false)

  // Deep link dari push (WebView shell / ?goto=)
  useEffect(() => {
    const go = (raw: string) => {
      if (!raw || !raw.startsWith("/")) return
      // Simpan query (?tab=report dll.)
      const target = raw.startsWith("/app") ? raw : raw
      const wantsNotifList = target === "/app/notifications" || target.includes("openNotif=1")
      if (wantsNotifList) setOpenShade(true)
      const pathOnly = target.split("?")[0] || "/app"
      if (pathname !== pathOnly || target.includes("?")) router.replace(target)
    }
    const onNav = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail
      go(detail)
    }
    window.addEventListener("sevenbro-navigate", onNav as EventListener)
    window.addEventListener("sevenbro:navigate", onNav as EventListener)
    try {
      const q = new URLSearchParams(window.location.search)
      const goto = q.get("goto")
      if (goto) go(decodeURIComponent(goto))
      else if (q.get("openNotif") === "1") {
        setOpenShade(true)
        if (pathname !== "/app/notifications") router.replace("/app/notifications")
      }
    } catch {
      /* ignore */
    }
    return () => {
      window.removeEventListener("sevenbro-navigate", onNav as EventListener)
      window.removeEventListener("sevenbro:navigate", onNav as EventListener)
    }
  }, [pathname, router])

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
      openNotif={openShade}
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
