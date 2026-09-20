"use client"

import { useEffect, useState, type ReactNode } from "react"
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
  X,
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
import MassReportVoteModal from "@/components/MassReportVoteModal"

export type AppShellNav = {
  href: string
  label: string
  icon: LucideIcon
  /** Item tampil tapi tidak bisa ditap */
  disabled?: boolean
}

export type AppShellNotification = {
  id: string
  title: string
  body: string
  time: string
  read: boolean
  kind?: string | null
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
  /** Deep-link: buka shade notifikasi */
  openNotif?: boolean
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

/** Empty state notifikasi — animated WebP transparan */
function MailIcon() {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/notif-empty.webp"
      alt=""
      aria-hidden="true"
      className="h-14 w-auto object-contain bg-transparent"
      width={56}
      height={45}
    />
  )
}

/** Kartu notifikasi — title · body · waktu di bawah · tombol X */
function NotifCard({
  n,
  onDelete,
  onOpen,
}: {
  n: AppShellNotification
  onDelete: () => void
  onOpen: () => void
}) {
  return (
    <li className="relative select-none">
      <div
        onClick={onOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpen()
        }}
        className="flex items-stretch rounded-xl bg-white border border-line cursor-pointer active:opacity-95"
      >
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onOpen()
            }}
            className="w-full text-left px-2.5 pt-2.5 pb-1"
          >
            <div className="flex items-center gap-2 min-w-0">
              {!n.read && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-forest" />
              )}
              <span
                className={`min-w-0 flex-1 truncate text-xs ${
                  n.read ? "font-medium text-ink/80" : "font-semibold text-ink"
                }`}
              >
                {n.title}
              </span>
            </div>
            <p className="mt-0.5 truncate text-xs text-ink-soft/75">{n.body}</p>
            <p className="mt-0.5 text-xs text-ink-soft/55">{n.time}</p>
          </button>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          aria-label="Hapus notifikasi"
          className="flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-lg text-ink-soft/70 active:bg-alert-bg active:text-alert mr-1"
        >
          <X className="h-4 w-4" />
        </button>
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
      <span className="flex-1 text-left text-sm font-semibold text-ink">
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
  openNotif = false,
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
      // Android shell: token FCM sudah di-register via useFcmTokenRegister
      showBrowserNotification(
        "Notifikasi Push Aktif",
        "Info kelas akan muncul di perangkat ini.",
      )
    }
  }

  const unread = notifications.filter((n) => !n.read).length

  useEffect(() => {
    if (openNotif) setShowNotif(true)
  }, [openNotif])

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
    // fixed inset-0: selalu isi viewport penuh (lebih andal dari h-dvh di WebView)
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-page">
      {/* Header — selalu di atas; bg ikut light/dark via token bg-white → .dark */}
      <header
        className="sevenbro-header shrink-0 sticky top-0 z-40 bg-white border-b border-line"
        style={{ paddingTop: "var(--sevenbro-status-bar-inset, 0px)" }}
      >
          <div className="flex items-center justify-between gap-2 min-w-0 px-4 h-[50px] overflow-hidden">
            <div className="flex items-center gap-2.5 min-w-0">
              {brand.logoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={brand.logoSrc}
                  alt={brand.logoAlt || brand.title}
                  className="h-9 w-9 shrink-0 rounded-xl object-contain"
                  width={36}
                  height={36}
                />
              ) : (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-forest text-white font-bold text-sm">
                  {brand.title.slice(0, 2)}
                </div>
              )}
              <div className="min-w-0 flex-1 flex flex-col justify-center">
                <span className="brand-burst-wrap">
                  <span className="text-[17px] brand-title leading-[1.15]">
                    <span className="font-brocklyns">Seven Bro</span>
                    <span className="font-sans font-black text-[1.1em] ml-0.5">!</span>
                  </span>
                </span>
                <span className="brand-caption truncate block leading-none">7B Class Management</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
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
                <span className="absolute top-0 right-0 z-10 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-amber px-0.5 text-[11px] font-bold leading-none text-white ring-1 ring-white">
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
        className={`fixed inset-0 z-50 bg-page flex flex-col overflow-hidden transition-transform duration-300 ease-out ${
          showNotif ? "translate-y-0" : "-translate-y-full pointer-events-none"
        }`}
        aria-hidden={!showNotif}
        inert={!showNotif}
      >
        {/* Header */}
        <div
          className="shrink-0 px-3 pb-1 border-b border-line/60 bg-page/95 backdrop-blur-lg"
          style={{
            paddingTop: "calc(var(--sevenbro-status-bar-inset, 0px) + 0.75rem)",
          }}
        >
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
                <p className="text-sm font-semibold text-ink">Pengaturan Cepat</p>
                <button
                  type="button"
                  onClick={() => setShowQuick(false)}
                  className="text-xs font-medium text-forest active:opacity-70"
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
                <p className="text-sm text-ink-soft/70 mt-2 leading-relaxed max-w-[250px]">
                  Notifikasi Anda akan muncul di sini setelah Anda menerimanya.
                </p>
              </div>
            ) : (
              <div className="px-3 pt-2">
                <div className="flex items-center justify-between px-1 pb-2">
                  <p className="text-sm text-ink-soft/55 font-medium">Sebelumnya</p>
                  {onClearAllNotifications && (
                    <button
                      type="button"
                      onClick={onClearAllNotifications}
                      className="text-xs font-semibold text-alert active:opacity-70"
                    >
                      Hapus Semua
                    </button>
                  )}
                </div>
                <ul className="space-y-2">
                  {notifications.map((n) => (
                    <NotifCard
                      key={n.id}
                      n={n}
                      onDelete={() => onNotificationDelete?.(n.id)}
                      onOpen={() => {
                        onNotificationClick?.(n.id)
                        setShowNotif(false)
                      }}
                    />
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Link riwayat — selalu di area bawah */}
          <div className="shrink-0 px-6 pb-10 pt-6 text-center">
            <p className="text-sm text-ink-soft/55">Notifikasi tidak ditemukan?</p>
            <button
              type="button"
              onClick={() => {
                closeAll()
                onViewHistory?.()
              }}
              className="text-sm font-semibold text-forest mt-0.5 active:opacity-70"
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
                <p className="text-sm font-bold text-ink truncate">{user?.name}</p>
                <p className="text-xs text-ink-soft/55 truncate">
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
                  className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface transition"
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
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-ink hover:bg-surface transition"
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
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition"
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

      <main className="flex-1 min-h-0 scroll-y-only pb-2">{children}</main>

      {/* Modal vote mass report — tampil global saat report VOTING */}
      <MassReportVoteModal />

      {/* Bottom nav — selalu menempel di bawah */}
      <nav
        className="sevenbro-nav shrink-0 sticky bottom-0 z-40 bg-white border-t border-line"
        aria-label="Navigasi utama"
        style={{
          paddingBottom:
            "calc(var(--sevenbro-nav-bar-inset, 0px) + var(--sevenbro-safe-bottom, env(safe-area-inset-bottom, 0px)))",
        }}
      >
        <div
          className="grid w-full max-w-lg mx-auto py-1"
          style={{
            gridTemplateColumns: `repeat(${Math.max(nav.items.length, 3)}, minmax(0, 1fr))`,
          }}
        >
          {nav.items.map(({ href, label, icon: Icon, disabled }) => {
            if (disabled) {
              return (
                <span
                  key={label}
                  aria-disabled="true"
                  className="flex flex-col items-center justify-center gap-0.5 py-1.5 px-0.5 rounded-xl text-ink-soft/35 opacity-60 select-none"
                >
                  <Icon className="h-[20px] w-[20px]" />
                  <span className="text-xs font-semibold whitespace-nowrap">{label}</span>
                </span>
              )
            }
            return (
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
                <span className="text-xs font-semibold whitespace-nowrap">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
