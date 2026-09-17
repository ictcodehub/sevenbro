"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  BellRing,
  Settings2,
  LogOut,
  Megaphone,
  Wallet,
  Trophy,
  CalendarDays,
  ArrowLeft,
  Moon,
  WifiOff,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import {
  DEFAULT_PREFS,
  applyDarkMode,
  applyPrefsPatch,
  loadPrefs,
  showBrowserNotification,
  type Prefs,
} from "@/lib/prefs"

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
  onViewHistory?: () => void
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

/** Ikon mailbox — flat, palette forest/lime */
function MailIcon() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 30c0-2.2 1.8-4 4-4h40c2.2 0 4 1.8 4 4v18a4 4 0 0 1-4 4H12a4 4 0 0 1-4-4V30z"
        fill="#D7F2A4"
      />
      <path
        d="M8 30l20-12h24l-20 12H8z"
        fill="#A3E635"
      />
      <path
        d="M8 30l12 10h24l12-10"
        stroke="#144D36"
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />
      <rect x="38" y="10" width="18" height="14" rx="2" fill="#fff" stroke="#144D36" strokeWidth="1.5"/>
      <path d="M42 16h10M42 20h7" stroke="#A3E635" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="52" cy="12" r="4" fill="#FBA94C"/>
    </svg>
  )
}

/** Kartu notifikasi ala iOS — tanpa avatar, swipe-to-delete */
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
    if (dx < -THRESHOLD) onDelete()
    setDx(0)
    startRef.current = null
  }

  return (
    <li
      className={`relative select-none touch-pan-y transition-opacity duration-200 ${
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
        className={`relative px-3.5 py-3 cursor-pointer active:opacity-95 rounded-2xl bg-white shadow-sm ${
          dx !== 0 ? "" : "transition-transform duration-200"
        }`}
        style={{ transform: `translateX(${dx}px)` }}
      >
        <div className="flex items-start justify-between gap-2">
          <p
            className={`text-[13px] leading-snug truncate ${
              n.read ? "font-medium text-ink/80" : "font-semibold text-ink"
            }`}
          >
            {n.title}
          </p>
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <span className="text-[10px] text-ink-soft/50">{n.time}</span>
            {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-forest" />}
          </div>
        </div>
        <p className="text-[12px] text-ink-soft/70 mt-1 leading-snug">{n.body}</p>
      </div>
    </li>
  )
}

/** Toggle row untuk pengaturan cepat */
function QuickToggle({
  label,
  on,
  onChange,
  icon,
}: {
  label: string
  on: boolean
  onChange: (v: boolean) => void
  icon: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      aria-pressed={on}
      className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 active:bg-surface/80 transition"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface shrink-0">
        {icon}
      </span>
      <span className="flex-1 text-left text-[12px] font-semibold text-ink">
        {label}
      </span>
      <span
        className={`h-6 w-10 rounded-full p-0.5 shrink-0 transition-colors ${
          on ? "bg-forest" : "bg-line"
        }`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
            on ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
    </button>
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
  onViewHistory,
  onSignOut,
  adminItems = [],
}: AppShellProps) {
  const pathname = usePathname()
  const [showNotif, setShowNotif] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showQuick, setShowQuick] = useState(false)
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)

  useEffect(() => {
    const stored = loadPrefs()
    setPrefs(stored)
    applyDarkMode(stored.dark)
  }, [])

  const updatePrefs = async (patch: Partial<Prefs>) => {
    const next = await applyPrefsPatch(prefs, patch)
    if (!next) return
    setPrefs(next)
    if (patch.push === true) {
      showBrowserNotification(
        "Notifikasi Push Aktif",
        "Info pengumuman dan pengingat iuran akan muncul di perangkat ini."
      )
    }
  }

  const unread = notifications.filter((n) => !n.read).length

  const isActive = (href: string) =>
    href === "/app" ? pathname === "/app" : pathname === href || pathname.startsWith(`${href}/`)

  const closeAll = () => {
    setShowNotif(false)
    setShowProfile(false)
    setShowQuick(false)
  }

  // Quick sheet tidak boleh hidup sendiri saat shade tertutup
  useEffect(() => {
    if (!showNotif) setShowQuick(false)
  }, [showNotif])

  return (
    <div className="min-h-dvh bg-page flex flex-col">
      {/* Header — tanpa backdrop-blur supaya badge tidak ter-clip */}
      <header className="sticky top-0 z-40 bg-white border-b border-line">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest text-white font-bold text-sm">
              {brand.title.slice(0, 2)}
            </div>
            <span className="text-sm font-bold text-ink truncate">{brand.title}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setShowNotif((v) => !v)
                setShowProfile(false)
                setShowQuick(false)
              }}
              aria-label={`Notifikasi${unread > 0 ? `, ${unread} belum dibaca` : ""}`}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl text-ink hover:bg-surface transition"
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 z-10 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </button>
            {user && (
              <>
                <span className="w-px h-5 bg-line mx-0.5 shrink-0" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => {
                    setShowProfile((v) => !v)
                    setShowNotif(false)
                    setShowQuick(false)
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

      {/* Notification shade — slide dari atas, palette white-green */}
      <div
        className={`fixed inset-0 z-50 bg-page flex flex-col transition-transform duration-300 ease-out ${
          showNotif ? "translate-y-0" : "-translate-y-full pointer-events-none"
        }`}
        aria-hidden={!showNotif}
        inert={!showNotif}
      >
        {/* Header */}
        <div className="shrink-0 px-3 pt-3 pb-1 border-b border-line/60 bg-page/95 backdrop-blur-lg">
          <div className="relative flex items-center justify-center h-10">
            <button
              type="button"
              onClick={closeAll}
              aria-label="Kembali"
              className="absolute left-0 flex h-9 w-9 items-center justify-center text-ink active:opacity-70"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-[17px] font-semibold text-ink">Notifikasi</h1>
            <button
              type="button"
              onClick={() => setShowQuick((v) => !v)}
              aria-label="Pengaturan cepat"
              aria-expanded={showQuick}
              className={`absolute right-0 flex h-9 w-9 items-center justify-center rounded-xl active:opacity-70 transition ${
                showQuick ? "bg-forest/15 text-forest" : "text-ink"
              }`}
            >
              <Settings2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Quick actions — card penuh di bawah header (nyambung ke gear) */}
        {showNotif && showQuick && (
          <div
            className="absolute inset-0 z-10 bg-deep/20"
            onClick={() => setShowQuick(false)}
            aria-hidden="true"
          />
        )}
        {showNotif && (
          <div
            className={`absolute inset-x-0 top-16 z-20 px-3 pt-1 transition-all duration-200 ease-out ${
              showQuick
                ? "opacity-100 translate-y-0 pointer-events-auto"
                : "opacity-0 -translate-y-3 pointer-events-none"
            }`}
            role="dialog"
            aria-label="Pengaturan cepat"
            aria-hidden={!showQuick}
            inert={!showQuick}
          >
            <div className="bg-white border border-line shadow-lg rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 pt-3.5 pb-2">
                <p className="text-[12px] font-semibold text-ink">Pengaturan Cepat</p>
                <button
                  type="button"
                  onClick={() => setShowQuick(false)}
                  className="text-[11px] font-medium text-forest active:opacity-70"
                >
                  Selesai
                </button>
              </div>
              <div className="px-1.5 pb-2">
                <QuickToggle
                  label="Notifikasi Push"
                  on={prefs.push}
                  onChange={(v) => {
                    void updatePrefs({ push: v })
                  }}
                  icon={<BellRing className="h-4 w-4 text-forest" />}
                />
                <QuickToggle
                  label="Mode Gelap"
                  on={prefs.dark}
                  onChange={(v) => {
                    void updatePrefs({ dark: v })
                  }}
                  icon={<Moon className="h-4 w-4 text-forest" />}
                />
                <QuickToggle
                  label="Mode Hemat Data"
                  on={prefs.offline}
                  onChange={(v) => {
                    void updatePrefs({ offline: v })
                  }}
                  icon={<WifiOff className="h-4 w-4 text-forest" />}
                />
              </div>
            </div>
          </div>
        )}

        {/* Konten */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          <div className="flex-1">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center px-8 pt-16 text-center">
                <div className="mb-5">
                  <MailIcon />
                </div>
                <h2 className="text-[20px] font-bold text-ink">
                  Belum ada notifikasi
                </h2>
                <p className="text-[13px] text-ink-soft/70 mt-2 leading-relaxed max-w-[250px]">
                  Notifikasi Anda akan muncul di sini setelah Anda menerimanya.
                </p>
              </div>
            ) : (
              <div className="px-3 pt-2">
                <p className="text-[12px] text-ink-soft/55 px-1 pb-2 font-medium">
                  Sebelumnya
                </p>
                <ul className="space-y-2">
                  {notifications.map((n) => (
                    <NotifCard
                      key={n.id}
                      n={n}
                      onDelete={() => onNotificationDelete?.(n.id)}
                      onOpen={() => onNotificationClick?.(n.id)}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Link riwayat — selalu di area bawah */}
          <div className="shrink-0 px-6 pb-10 pt-6 text-center">
            <p className="text-[12px] text-ink-soft/55">Notifikasi tidak ditemukan?</p>
            <button
              type="button"
              onClick={() => {
                closeAll()
                onViewHistory?.()
              }}
              className="text-[13px] font-semibold text-forest mt-0.5 active:opacity-70"
            >
              Lihat Riwayat Notifikasi
            </button>
          </div>
        </div>
      </div>

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
