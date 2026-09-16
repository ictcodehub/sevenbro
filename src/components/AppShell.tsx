"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Settings2, LogOut, Shield } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export type AppShellNav = {
  href: string
  label: string
  icon: LucideIcon
}

export type AppShellNotification = {
  id: string
  title: string
  body: string
  time: string
  read: boolean
}

export type AppShellUser = {
  name: string
  avatar?: string
}

export type AppShellProps = {
  children: ReactNode
  brand: {
    logoSrc: string
    logoAlt: string
    title: string
  }
  nav: {
    items: AppShellNav[]
  }
  notifications?: AppShellNotification[]
  user?: AppShellUser
  onNotificationClick?: (id: string) => void
  onSettings?: () => void
  onSignOut?: () => void
  adminItems?: { href: string; label: string; icon: LucideIcon }[]
}

export default function AppShell({
  children,
  brand,
  nav,
  notifications = [],
  user,
  onNotificationClick,
  onSettings,
  onSignOut,
  adminItems = [],
}: AppShellProps) {
  const pathname = usePathname()
  const [showNotif, setShowNotif] = useState(false)
  const [showSettings, setShowSettings] = useState(false)

  const unread = notifications.filter((n) => !n.read).length
  const showBell = notifications.length > 0

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`)

  const closeAll = () => {
    setShowNotif(false)
    setShowSettings(false)
  }

  return (
    <div className="min-h-dvh bg-page flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-line">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest text-white font-bold text-sm">
              {brand.title.slice(0, 2)}
            </div>
            <span className="text-sm font-bold text-ink truncate">{brand.title}</span>
          </div>
          <div className="flex items-center gap-1">
            {showBell && (
              <button
                onClick={() => { setShowNotif((v) => !v); setShowSettings(false) }}
                aria-label={`Notifikasi${unread > 0 ? `, ${unread} belum dibaca` : ""}`}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl text-ink hover:bg-surface transition"
              >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 text-[9px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
            )}

            {/* Admin menu button (for HOMEROOM) */}
            {adminItems.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => { setShowSettings((v) => !v); setShowNotif(false) }}
                  aria-label="Menu Admin"
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-amber hover:bg-amber/10 transition"
                >
                  <Shield className="h-5 w-5" />
                </button>
                {showSettings && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={closeAll} />
                    <div className="absolute right-4 top-16 w-56 bg-white border border-line rounded-2xl shadow-lg z-50 overflow-hidden">
                      <div className="px-4 py-3 border-b border-line">
                        <p className="text-[11px] font-bold text-ink">{user?.name}</p>
                        <p className="text-[10px] text-amber font-medium">Admin / Guru</p>
                      </div>
                      {adminItems.map(({ href, label, icon: Icon }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setShowSettings(false)}
                          className="w-full text-left px-4 py-3 text-[11px] text-ink hover:bg-surface transition flex items-center gap-2"
                        >
                          <Icon className="h-4 w-4" /> {label}
                        </Link>
                      ))}
                      <button
                        onClick={() => { onSettings?.(); setShowSettings(false) }}
                        className="w-full text-left px-4 py-3 text-[11px] text-ink hover:bg-surface transition flex items-center gap-2 border-t border-line"
                      >
                        <Settings2 className="h-4 w-4" /> Pengaturan
                      </button>
                      {onSignOut && (
                        <button
                          onClick={() => { onSignOut(); setShowSettings(false) }}
                          className="w-full text-left px-4 py-3 text-[11px] text-red-500 hover:bg-red-50 transition flex items-center gap-2"
                        >
                          <LogOut className="h-4 w-4" /> Keluar
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}

            <button
              onClick={() => { setShowSettings((v) => !v); setShowNotif(false) }}
              aria-label="Pengaturan"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-ink hover:bg-surface transition"
            >
              <Settings2 className="h-5 w-5" />
            </button>
            {user && (
              <div className="ml-1 pl-2 border-l border-line">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="bg-forest text-white text-xs font-semibold">
                    {user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
          </div>
        </div>

        {/* Notifikasi dropdown */}
        {showNotif && (
          <>
            <div className="fixed inset-0 z-30" onClick={closeAll} />
            <div className="absolute right-4 top-16 w-72 bg-white border border-line rounded-2xl shadow-lg z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-line">
                <h3 className="text-sm font-bold text-ink">Notifikasi</h3>
                {unread > 0 && (
                  <button
                    onClick={() => { notifications.forEach((n) => onNotificationClick?.(n.id)); setShowNotif(false) }}
                    className="text-[10px] text-forest font-semibold"
                  >
                    Tandai semua dibaca
                  </button>
                )}
              </div>
              <ul className="max-h-48 overflow-y-auto">
                {notifications.length === 0 ? (
                  <li className="px-4 py-6 text-center text-[11px] text-ink-soft/60">Belum ada notifikasi</li>
                ) : notifications.map((n) => (
                  <li
                    key={n.id}
                    onClick={() => { onNotificationClick?.(n.id); setShowNotif(false) }}
                    className={`px-4 py-3 cursor-pointer hover:bg-surface transition ${!n.read ? "bg-primary/[0.03]" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-forest" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold text-ink truncate">{n.title}</p>
                        <p className="text-[10px] text-ink-soft/75 mt-0.5">{n.body}</p>
                        <p className="text-[9px] text-ink-soft/50 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* User dropdown (non-admin) */}
        {!adminItems.length && showSettings && (
          <>
            <div className="fixed inset-0 z-30" onClick={closeAll} />
            <div className="absolute right-4 top-16 w-56 bg-white border border-line rounded-2xl shadow-lg z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-line">
                <p className="text-[11px] font-bold text-ink">{user?.name}</p>
                <p className="text-[10px] text-ink-soft/75">Seven Bro! 7B</p>
              </div>
              <button
                onClick={() => { onSettings?.(); setShowSettings(false) }}
                className="w-full text-left px-4 py-3 text-[11px] text-ink hover:bg-surface transition flex items-center gap-2"
              >
                <Settings2 className="h-4 w-4" /> Pengaturan
              </button>
              {onSignOut && (
                <button
                  onClick={() => { onSignOut(); setShowSettings(false) }}
                  className="w-full text-left px-4 py-3 text-[11px] text-red-500 hover:bg-red-50 transition flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" /> Keluar
                </button>
              )}
            </div>
          </>
        )}
      </header>

      <main className="flex-1 overflow-y-auto pb-2">{children}</main>

      {/* Bottom Nav — grid sama rata, semua item porsi identik */}
            <nav
              className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-xl border-t border-line"
              aria-label="Navigasi utama"
            >
              <div
                className="grid w-full max-w-lg mx-auto py-1"
                style={{ gridTemplateColumns: `repeat(${Math.max(nav.items.length, 3)}, minmax(0, 1fr))` }}
              >
                {nav.items.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    aria-current={isActive(href) ? "page" : undefined}
                    className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-0.5 rounded-xl transition-all ${
                      isActive(href)
                        ? "bg-forest/15 text-forest"
                        : "text-ink-soft/75 hover:text-ink-soft"
                    }`}
                  >
                    <Icon className="h-[20px] w-[20px]" />
                    <span className="text-[10px] font-semibold whitespace-nowrap">{label}</span>
                  </Link>
                ))}
              </div>
            </nav>
    </div>
  )
}