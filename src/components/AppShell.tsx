"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  Settings2,
  LogOut,
  X,
  Megaphone,
  Wallet,
  Trophy,
  CalendarDays,
  Trash2,
  CheckCheck,
} from "lucide-react"
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
  onNotificationDelete?: (id: string) => void
  onClearAllNotifications?: () => void
  onSettings?: () => void
  onSignOut?: () => void
  adminItems?: { href: string; label: string; icon: LucideIcon }[]
}

function notifIcon(title: string) {
  if (/pengumuman|info/i.test(title)) return Megaphone
  if (/iuran|kas/i.test(title)) return Wallet
  if (/poin/i.test(title)) return Trophy
  if (/agenda|kegiatan/i.test(title)) return CalendarDays
  return Bell
}

export default function AppShell({
  children,
  brand,
  nav,
  notifications = [],
  user,
  onNotificationClick,
  onNotificationDelete,
  onClearAllNotifications,
  onSettings,
  onSignOut,
  adminItems = [],
}: AppShellProps) {
  const pathname = usePathname()
  const [showNotif, setShowNotif] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [swipeId, setSwipeId] = useState<string | null>(null)

  const unread = notifications.filter((n) => !n.read).length
  const showBell = notifications.length > 0

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`)

  const closeAll = () => {
    setShowNotif(false)
    setShowProfile(false)
    setSwipeId(null)
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
          <div className="flex items-center gap-1.5">
            {showBell && (
              <button
                onClick={() => {
                  setShowNotif((v) => !v)
                  setShowProfile(false)
                  setSwipeId(null)
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
      </header>

      {/* Notification shade — hijau transparan + blur tipis */}
      {showNotif && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <button
            type="button"
            aria-label="Tutup notifikasi"
            onClick={closeAll}
            className="absolute inset-0 bg-forest/25 backdrop-blur-[2px]"
          />
          <div className="relative z-10 flex flex-col h-full">
            {/* Header shade */}
            <div className="bg-forest/90 backdrop-blur-md text-white px-4 pt-5 pb-3.5 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-lime" />
                  <h2 className="text-[15px] font-bold text-white">Notifikasi</h2>
                </div>
                <button
                  onClick={closeAll}
                  aria-label="Tutup"
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/15 text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-white/60">
                  {unread > 0 ? `${unread} belum dibaca` : "Semua sudah dibaca"}
                </p>
                <div className="flex items-center gap-2">
                  {unread > 0 && (
                    <button
                      onClick={() => {
                        notifications
                          .filter((n) => !n.read)
                          .forEach((n) => onNotificationClick?.(n.id))
                      }}
                      className="flex items-center gap-1 text-[11px] font-semibold text-lime"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Tandai semua
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={() => onClearAllNotifications?.()}
                      className="flex items-center gap-1 text-[11px] font-semibold text-white/70"
                      title="Hapus semua"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Daftar */}
            <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
              {notifications.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <Bell className="h-10 w-10 text-white/30 mx-auto mb-3" />
                  <p className="text-[13px] font-medium text-white/60">Belum ada notifikasi</p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {notifications.map((n) => {
                    const Icon = notifIcon(n.title)
                    return (
                      <li
                        key={n.id}
                        className={`relative rounded-2xl overflow-hidden border transition ${
                          !n.read
                            ? "bg-white/95 border-forest/25 shadow-sm"
                            : "bg-white/70 border-white/40"
                        }`}
                      >
                        {/* Swipe / hapus */}
                        <div className="absolute inset-y-0 right-0 w-16 bg-alert flex items-center justify-center">
                          <button
                            type="button"
                            aria-label="Hapus notifikasi"
                            onClick={() => onNotificationDelete?.(n.id)}
                            className="flex flex-col items-center gap-0.5 text-white"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="text-[9px] font-semibold">Hapus</span>
                          </button>
                        </div>
                        {/* Konten — geser kiri saat swipeId aktif */}
                        <div
                          className={`relative flex items-start gap-2.5 px-3 py-3 transition-transform ${
                            swipeId === n.id ? "-translate-x-16" : "translate-x-0"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSwipeId(swipeId === n.id ? null : n.id)
                            }}
                            onDoubleClick={() => onNotificationClick?.(n.id)}
                            className="flex items-start gap-2.5 flex-1 min-w-0 text-left"
                          >
                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 ${
                                !n.read ? "bg-forest text-lime" : "bg-surface text-ink-soft"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                            </span>
                            <span className="flex-1 min-w-0">
                              <span className="flex items-center gap-1.5">
                                <span
                                  className={`text-[12px] leading-snug ${
                                    !n.read ? "font-bold text-ink" : "font-medium text-ink/70"
                                  }`}
                                >
                                  {n.title}
                                </span>
                                {!n.read && (
                                  <span className="h-1.5 w-1.5 rounded-full bg-forest shrink-0" />
                                )}
                              </span>
                              <span className="block text-[11px] text-ink-soft/70 mt-0.5 leading-snug">
                                {n.body}
                              </span>
                              <span className="block text-[9px] text-ink-soft/45 mt-1">
                                {n.time}
                              </span>
                            </span>
                          </button>
                          {swipeId === n.id && (
                            <button
                              type="button"
                              aria-label="Tutup hapus"
                              onClick={() => setSwipeId(null)}
                              className="shrink-0 self-center text-ink-soft/40 p-1"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Profile dropdown */}
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

      <main className="flex-1 overflow-y-auto pb-2">{children}</main>

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
