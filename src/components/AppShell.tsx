"use client"

import { useEffect, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import { Bell, Clock, Info, LogOut, X, Zap } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

// ============================================================
// AppShell — generic mobile app frame
// - Header: brand + notifications + profile (fully prop-driven)
// - Bottom nav: up to 5 items, home in the middle
// - No business logic: nav, notifications, profile and actions
//   are all passed as props. See src/app/app/layout.tsx.
// ============================================================

export type AppShellNav = {
  href: string
  label: string
  icon: LucideIcon
}

export type AppShellNotification = {
  id: string
  kind: "update" | "reminder" | "alert"
  title: string
  body: string
  href?: string
}

export type AppShellUser = {
  name: string
  email: string
  image?: string
}

export type AppShellAction = {
  label: string
  href: string
  icon?: ReactNode
}

export type AppShellProps = {
  children: ReactNode
  /** Brand logo (from /public), title and subtitle shown in the header */
  brand: {
    logoSrc: string
    logoAlt: string
    title: string
    subtitle: string
  }
  /** Left nav pair, center item, right nav pair (max 2 each side) */
  nav: {
    left: AppShellNav[]
    home: AppShellNav
    right: AppShellNav[]
  }
  /** Notifications — pass [] to hide the bell entirely */
  notifications?: AppShellNotification[]
  /** Unread ids (persisted read-state is the caller's concern) */
  unreadIds?: ReadonlySet<string>
  onMarkAllRead?: () => void
  onClearNotifications?: () => void
  /** Called when a single notification is tapped (id) — mark it read */
  onNotificationClick?: (id: string) => void
  /** Signed-in user; omit to hide the avatar/profile dropdown */
  user?: AppShellUser
  /** Extra links in the profile dropdown (e.g. admin panel) */
  profileActions?: AppShellAction[]
  onSignOut?: () => void
}

export default function AppShell({
  children,
  brand,
  nav,
  notifications = [],
  unreadIds = new Set(),
  onMarkAllRead,
  onClearNotifications,
  onNotificationClick,
  user,
  profileActions = [],
  onSignOut,
}: AppShellProps) {
  const pathname = usePathname()
  const [showNotif, setShowNotif] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  const unread = mounted ? unreadIds.size : 0

  const isActive = (href: string) =>
    href === nav.home.href ? pathname === nav.home.href : pathname.startsWith(href)

  const closeAll = () => {
    setShowNotif(false)
    setShowProfile(false)
  }

  const showBell = notifications.length > 0 || unread > 0


  return (
    <div className="min-h-dvh bg-page flex flex-col">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-line">
        <div className="flex items-center justify-between px-4 h-16 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Full logo — no crop: large box, object-contain, no overflow hidden */}
            <div className="h-10 w-10 shrink-0 flex items-center justify-center">
              <Image
                src={brand.logoSrc}
                alt={brand.logoAlt}
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
                priority
              />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink leading-tight truncate">
                {brand.title}
              </p>
              <p className="mt-1 text-[9px] text-ink-soft/70 leading-tight truncate">
                {brand.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {showBell && (
              <button
                onClick={() => {
                  setShowProfile(false)
                  setShowNotif((v) => !v)
                }}
                className="relative flex h-9 w-9 items-center justify-center rounded-full hover:bg-page transition-colors"
                aria-label={`Notifications (${unread})`}
              >
                <Bell className="h-4.5 w-4.5 text-ink-soft" />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[8px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
            )}
            {user && (
              <button
                onClick={() => {
                  setShowNotif(false)
                  setShowProfile((v) => !v)
                }}
                className="flex h-9 w-9 items-center justify-center"
                aria-label="Profile"
              >
                <Avatar className="h-8 w-8 ring-2 ring-line">
                  <AvatarImage src={user.image} />
                  <AvatarFallback className="text-[10px] bg-surface text-ink-soft">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
              </button>
            )}
          </div>
        </div>

        {/* Profile dropdown */}
        {user && showProfile && (
          <div className="absolute top-16 right-4 w-56 bg-page rounded-xl shadow-lg border border-line py-2 z-50">
            <div className="px-3 py-2 border-b border-line/60">
              <p className="text-xs font-semibold text-ink truncate">{user.name}</p>
              <p className="text-[10px] text-ink-soft truncate">{user.email}</p>
            </div>
            {profileActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                onClick={() => setShowProfile(false)}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-ink hover:bg-surface/60 transition-colors"
              >
                {action.icon}
                {action.label}
              </Link>
            ))}
            {onSignOut && (
              <button
                onClick={onSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            )}
          </div>
        )}

        {/* Notification shade */}
        {showNotif && (
          <div className="absolute top-16 right-0 left-0 bg-page border-b border-line shadow-xl z-50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-line/50">
              <div>
                <span className="text-xs font-semibold text-ink">Notifications</span>
                <p className="text-[9px] text-ink-soft/70 mt-0.5">
                  Updates · live
                </p>
              </div>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && onMarkAllRead && (
                  <button
                    onClick={onMarkAllRead}
                    className="text-[10px] font-medium text-forest"
                  >
                    Mark read
                  </button>
                )}
                <button
                  onClick={() => setShowNotif(false)}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-ink-soft/75 hover:bg-page"
                  aria-label="Close"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="max-h-[42vh] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <Bell className="mx-auto mb-2 h-6 w-6 text-ink-soft/30" />
                  <p className="text-[11px] text-ink-soft/70 font-medium">
                    No notifications right now
                  </p>
                  <p className="mt-0.5 text-[9px] text-ink-soft/50">
                    You&apos;ll see updates here
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-line/50">
                  {notifications.map((n) => {
                    const Icon = kindIcon(n.kind)
                    const isUnread = unreadIds.has(n.id)
                    return (
                      <li key={n.id}>
                        <Link
                          href={n.href || "#"}
                          onClick={() => {
                            onNotificationClick?.(n.id)
                            setShowNotif(false)
                          }}
                          className={`flex gap-2.5 px-4 py-3 active:bg-surface/50 transition-colors ${
                            isUnread ? "bg-lime-soft/15" : ""
                          }`}
                        >
                          <span
                            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${toneFor(n.kind)}`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-[11px] font-semibold text-ink">
                                {n.title}
                              </span>
                              {isUnread && (
                                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-forest" />
                              )}
                            </span>
                            <span className="mt-0.5 block truncate text-[10px] text-ink-soft/75">
                              {n.body}
                            </span>
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {notifications.length > 0 && onClearNotifications && (
              <button
                onClick={onClearNotifications}
                className="w-full border-t border-line/50 py-2.5 text-[10px] font-medium text-ink-soft/60"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </header>

      {(showNotif || showProfile) && (
        <div className="fixed inset-0 z-30" onClick={closeAll} />
      )}
      <main className="flex-1 overflow-y-auto pb-2">{children}</main>

      <nav className="sticky bottom-0 z-40 bg-white/95 backdrop-blur-xl border-t border-line">
        <div className="flex items-center justify-between max-w-lg mx-auto px-2 h-14">
          {nav.left.map(({ href, label, icon: Icon }) => (
            <NavItem key={href} href={href} label={label} Icon={Icon} active={isActive(href)} />
          ))}
          <NavItem
            href={nav.home.href}
            label={nav.home.label}
            Icon={nav.home.icon}
            active={isActive(nav.home.href)}
          />
          {nav.right.map(({ href, label, icon: Icon }) => (
            <NavItem key={href} href={href} label={label} Icon={Icon} active={isActive(href)} />
          ))}
        </div>
      </nav>

    </div>
  )
}

function kindIcon(kind: AppShellNotification["kind"]) {
  if (kind === "alert") return Zap
  if (kind === "reminder") return Clock
  return Info
}

function toneFor(kind: AppShellNotification["kind"]) {
  if (kind === "alert") return "bg-amber/15 text-amber"
  if (kind === "reminder") return "bg-forest/12 text-forest"
  return "bg-deep/10 text-deep"
}

function NavItem({
  href,
  label,
  Icon,
  active,
}: {
  href: string
  label: string
  Icon: LucideIcon
  active: boolean
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex flex-col items-center justify-center gap-0.5 w-[52px] py-1.5 rounded-md transition-all ${
        active ? "bg-forest/15 text-forest" : "text-ink-soft/75 hover:text-ink-soft"
      }`}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.5} />
      <span className="text-[9px] font-medium truncate">{label}</span>
    </Link>
  )
}
