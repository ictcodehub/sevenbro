"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Activity, Bookmark, Compass, Home, Settings } from "lucide-react"
import AppShell from "@/components/AppShell"
import type { AppShellNotification } from "@/components/AppShell"
import { NOTIFICATIONS } from "@/lib/demo-data"

const READ_KEY = "nl-starter:read-notifications"

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

export default function ShellLayout({ children }: { children: ReactNode }) {
  const [notifs] = useState<AppShellNotification[]>(NOTIFICATIONS)
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setReadIds(loadRead())
    setMounted(true)
  }, [])

  const unread = mounted
    ? new Set(notifs.map((n) => n.id).filter((id) => !readIds.has(id)))
    : new Set<string>()

  const markRead = (id: string) => {
    const next = new Set(readIds)
    next.add(id)
    setReadIds(next)
    saveRead([...next])
  }

  const markAllRead = () => {
    const next = new Set(notifs.map((n) => n.id))
    setReadIds(next)
    saveRead([...next])
  }

  return (
    <AppShell
      brand={{
        logoSrc: "/brand-logo.png",
        logoAlt: "NL Starter",
        title: "NL Starter",
        subtitle: "Design system template",
      }}
      nav={{
        left: [
          { href: "/app/browse", label: "Browse", icon: Compass },
          { href: "/app/activity", label: "Activity", icon: Activity },
        ],
        home: { href: "/app", label: "Home", icon: Home },
        right: [
          { href: "/app/saved", label: "Saved", icon: Bookmark },
          { href: "/app/settings", label: "Settings", icon: Settings },
        ],
      }}
      notifications={notifs}
      unreadIds={unread}
      onNotificationClick={markRead}
      onMarkAllRead={markAllRead}
      user={{ name: "Demo User", email: "demo@example.com" }}
      onSignOut={() => {
        /* wire your auth here, e.g. signOut() from next-auth */
      }}
    >
      {children}
    </AppShell>
  )
}
