"use client"

import { useRef, useState, type ReactNode } from "react"
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

/** Kartu notifikasi ala iOS + swipe-to-delete */
function NotifCard({
  n,
  onDelete,
  onOpen,
}: {
  n: AppShellNotification
  onDelete: () => void
  onOpen: () => void
}) {
  const [dx, setDx] = useState(0)
  const startRef = useRef<number | null>(null)
  const dragging = useRef(false)
  const Icon = notifIcon(n.title)
  const THRESHOLD = 80

  const onDown = (e: React.PointerEvent) => {
    startRef.current = e.clientX
    dragging.current = true
  }
  const onMove = (e: React.PointerEvent) => {
    if (!dragging.current || startRef.current == null) return
    const delta = e.clientX - startRef.current
    if (delta < 0) setDx(Math.max(delta, -100))
  }
  const onUp = () => {
    if (!dragging.current) return
    dragging.current = false
    if (dx < -THRESHOLD) {
      onDelete()
      setDx(0)
    } else {
      setDx(0)
    }
    startRef.current = null
  }

  return (
    <li
      className={`relative rounded-2xl overflow-hidden select-none touch-pan-y transition-opacity duration-200 ${
        dx < -40 ? "opacity-40" : "opacity-100"
      }`}
    >
      <div
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        onClick={() => {
          if (dx === 0) onOpen()
          else setDx(0)
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpen()
        }}
        className={`relative flex items-start gap-2.5 px-3.5 py-3.5 cursor-pointer active:opacity-95 rounded-2xl border ${
          dx !== 0 ? "" : "transition-transform duration-200"
        } ${n.read ? "bg-white/75 border-white/35" : "bg-white border-forest/15"} shadow-sm`}
        style={{ transform: `translateX(${dx}px)` }}
      >
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 ${
            n.read ? "bg-surface text-ink-soft" : "bg-forest text-lime"
          }`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-start justify-between gap-2">
            <span
              className={`text-[13px] leading-snug ${
                n.read ? "font-medium text-ink/75" : "font-bold text-ink"
              }`}
            >
              {n.title}
            </span>
            <span className="text-[9px] text-ink-soft/40 shrink-0 mt-0.5">{n.time}</span>
          </span>
          <span className="block text-[12px] text-ink-soft/65 mt-0.5 leading-snug">
            {n.body}
          </span>
        </span>
      </div>
    </li>
  )
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

      {/* Notification shade — ala iOS Notification Center */}
      {showNotif && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <button
            type="button"
            aria-label="Tutup notifikasi"
            onClick={closeAll}
            className="absolute inset-0 bg-deep/30 backdrop-blur-[4px]"
          />
          <div className="relative z-10 flex flex-col h-full pt-2">
            {/* Panel header — rounded bawah, blur hijau */}
            <div className="bg-forest/92 backdrop-blur-md text-white rounded-b-[28px] px-5 pt-6 pb-5 shadow-[0_8px_32px_rgba(13,33,28,0.35)]">
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-lime/80 mb-1">
                    Seven Bro
                  </p>
                  <h2 className="text-[20px] font-bold text-white leading-tight tracking-tight">
                    Notifikasi
                  </h2>
                  <p className="text-[11px] text-white/50 mt-1">
                    {unread > 0
                      ? `${unread} belum dibaca`
                      : notifications.length > 0
                        ? `${notifications.length} notifikasi · sudah dibaca`
                        : "Kosong"}
                  </p>
                </div>
                <button
                  onClick={closeAll}
                  aria-label="Tutup"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white shrink-0 active:scale-95 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-3">
                {unread > 0 && (
                  <button
                    onClick={() => {
                      notifications
                        .filter((n) => !n.read)
                        .forEach((n) => onNotificationClick?.(n.id))
                    }}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-lime px-3 py-1.5 rounded-full bg-lime/15 border border-lime/25"
                  >
                    <CheckCheck className="h-3.5 w-3.5" />
                    Tandai Dibaca
                  </button>
                )}
                <button
                  onClick={() => onClearAllNotifications?.()}
                  className="flex items-center gap-1.5 text-[12px] font-medium text-white/70 px-3 py-1.5 rounded-full bg-white/10 border border-white/15"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus Semua
                </button>
              </div>
            </div>

            {/* Daftar — ala iOS */}
            <div className="flex-1 overflow-y-auto px-3 py-3 min-h-0">
              {notifications.length === 0 ? (
                <div className="px-6 py-16 text-center">
                  <Bell className="h-10 w-10 text-white/30 mx-auto mb-3" />
                  <p className="text-[13px] font-medium text-white/60">Belum ada notifikasi</p>
                  <p className="text-[11px] text-white/40 mt-1">Geser kartu ke kiri untuk hapus</p>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {notifications.map((n) => (
                    <NotifCard
                      key={n.id}
                      n={n}
                      onDelete={() => onNotificationDelete?.(n.id)}
                      onOpen={() => onNotificationClick?.(n.id)}
                    />
                  ))}
                </ul>
              )}
            </div>

            {/* Footer — Clear all ala iOS */}
            {notifications.length > 0 && (
              <div className="px-3 pb-4 pt-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onClearAllNotifications?.()}
                  className="w-full flex items-center justify-center gap-1.5 rounded-2xl bg-white/80 backdrop-blur border border-white/40 py-2.5 text-[12px] font-semibold text-ink/80"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Hapus Semua
                </button>
              </div>
            )}
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
