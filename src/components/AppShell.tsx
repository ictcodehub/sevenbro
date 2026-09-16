"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Bell, Settings2, LogOut, X } from "lucide-react"
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
  role?: string
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
  const [showProfile, setShowProfile] = useState(false)

  const unread = notifications.filter((n) => !n.read).length
  const showBell = notifications.length > 0

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`)

  const closeAll = () => {
    setShowNotif(false)
    setShowProfile(false)
  }

  return (
    <div className="min-h-dvh bg-page flex flex-col">
      {/* Header — clean: brand + notif + avatar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-line">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest text-white font-bold text-sm">
              {brand.title.slice(0, 2)}
            </div>
            <span className="text-sm font-bold text-ink truncate">{brand.title}</span>
          </div>
          <div className="flex items-center gap-1.5">
            {showBell && (
              <button
                onClick={() => {
                  setShowNotif((v) => !v)
                  setShowProfile(false)
                }}
                aria-label={`Notifikasi${unread > 0 ? `, ${unread} belum dibaca` : ""}`}
                className="relative flex h-9 w-9 items-center justify-center rounded-xl text-ink hover:bg-surface transition mt-1"
              >
                <Bell className="h-5 w-5" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber px-1 text-[9px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
            )}

            {user && (
              <>
                {showBell && (
                  <span className="w-px h-5 bg-line mx-0.5 shrink-0" aria-hidden="true" />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowProfile((v) => !v)
                    setShowNotif(false)
                  }}
                  aria-label="Menu profil"
                  className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-surface transition shrink-0"
                >
                  <Avatar className="h-8 w-8 ring-1 ring-line">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="bg-forest text-white text-xs font-semibold">
                      {user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Profile dropdown — campur, tanpa kategori */}
        {showProfile && (
          <>
            <div className="fixed inset-0 z-30" onClick={closeAll} />
            <div className="absolute right-3 top-16 z-50 w-60 bg-white border border-line rounded-2xl shadow-lg overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-line">
                <Avatar className="h-9 w-9 shrink-0 ring-1 ring-line">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="bg-forest text-white text-sm font-bold">
                    {user?.name?.charAt(0).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-[12px] font-bold text-ink truncate">{user?.name}</p>
                  <p className="text-[10px] text-ink-soft/55 truncate">
                    {user?.role || "Siswa"} · 7B
                  </p>
                </div>
              </div>
              <div className="py-1">
                {adminItems.map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setShowProfile(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium text-ink hover:bg-surface transition"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-ink-soft shrink-0">
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {label}
                  </Link>
                ))}
                <button
                  onClick={() => {
                    onSettings?.()
                    setShowProfile(false)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium text-ink hover:bg-surface transition"
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-ink-soft shrink-0">
                    <Settings2 className="h-3.5 w-3.5" />
                  </span>
                  Pengaturan
                </button>
                {onSignOut && (
                  <button
                    onClick={() => {
                      onSignOut()
                      setShowProfile(false)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-[12px] font-medium text-red-600 hover:bg-red-50 transition"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-500 shrink-0">
                      <LogOut className="h-3.5 w-3.5" />
                    </span>
                    Keluar
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </header>

      {/* Notification shade — di luar header (hindari backdrop-blur membatasi fixed) */}
      {showNotif && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <button
            type="button"
            aria-label="Tutup notifikasi"
            onClick={closeAll}
            className="absolute inset-0 bg-white/55 backdrop-blur-[3px]"
          />
          <div className="relative z-10 flex flex-col h-full bg-white/95 backdrop-blur-sm shadow-2xl">
            <div className="flex items-center justify-between px-4 pt-5 pb-3 border-b border-line bg-white/90 shrink-0">
              <div>
                <h2 className="text-[16px] font-bold text-ink">Notifikasi</h2>
                <p className="text-[10px] text-ink-soft/55 mt-0.5">
                  {unread > 0 ? `${unread} belum dibaca` : "Semua sudah dibaca"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button
                    onClick={() => {
                      notifications.forEach((n) => onNotificationClick?.(n.id))
                    }}
                    className="text-[11px] font-semibold text-forest"
                  >
                    Tandai semua
                  </button>
                )}
                <button
                  onClick={closeAll}
                  aria-label="Tutup"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface text-ink-soft"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
              {notifications.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <Bell className="h-10 w-10 text-ink-soft/25 mx-auto mb-3" />
                  <p className="text-[13px] font-medium text-ink-soft/50">
                    Belum ada notifikasi
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {notifications.map((n) => (
                    <li
                      key={n.id}
                      onClick={() => {
                        onNotificationClick?.(n.id)
                        setShowNotif(false)
                      }}
                      className={`rounded-xl px-3.5 py-3.5 cursor-pointer active:scale-[0.99] transition border ${
                        !n.read
                          ? "bg-forest/5 border-forest/20"
                          : "bg-surface/50 border-line/70"
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        {!n.read && (
                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-forest" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-[13px] leading-snug ${
                              !n.read ? "font-bold text-ink" : "font-medium text-ink/75"
                            }`}
                          >
                            {n.title}
                          </p>
                          <p className="text-[12px] text-ink-soft/70 mt-1 leading-snug">
                            {n.body}
                          </p>
                          <p className="text-[10px] text-ink-soft/45 mt-1.5">{n.time}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto pb-2">{children}</main>

      {/* Bottom Nav */}
      <nav
        className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-xl border-t border-line"
        aria-label="Navigasi utama"
      >
        <div
          className="grid w-full max-w-lg mx-auto py-1"
          style={{
            gridTemplateColumns: `repeat(${Math.max(nav.items.length, 3)}, minmax(0, 1fr))`,
          }}
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
