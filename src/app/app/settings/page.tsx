"use client"

import { useState } from "react"
import { LogOut, Moon, Smartphone, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SectionHeader } from "@/components/ui-primitives"

function Toggle({
  label,
  hint,
  on,
  onChange,
  icon,
}: {
  label: string
  hint?: string
  on: boolean
  onChange: (v: boolean) => void
  icon: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      className="w-full bg-white border border-line shadow-sm rounded-xl p-2.5 flex items-center gap-2.5 active:scale-[0.98] transition-transform"
      aria-pressed={on}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[11px] font-semibold text-ink truncate">{label}</p>
        {hint && <p className="text-[10px] text-ink-soft/75 truncate">{hint}</p>}
      </div>
      <span
        className={`h-5 w-9 rounded-full transition-colors relative shrink-0 ${
          on ? "bg-forest" : "bg-line"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            on ? "left-[18px]" : "left-0.5"
          }`}
        />
      </span>
    </button>
  )
}

export default function SettingsPage() {
  const [offline, setOffline] = useState(true)
  const [dark, setDark] = useState(false)

  return (
    <div className="px-4 py-3 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Settings</h1>
        <p className="text-[11px] text-ink-soft/75">App preferences & account</p>
      </div>

      <div>
        <SectionHeader title="Preferences" />
        <div className="space-y-1.5">
          <Toggle
            label="Offline caching"
            hint="PWA service worker (next-pwa)"
            on={offline}
            onChange={setOffline}
            icon={<WifiOff className="h-3.5 w-3.5 text-forest" />}
          />
          <Toggle
            label="Dark mode"
            hint="Tokens ready (.dark class in globals.css)"
            on={dark}
            onChange={setDark}
            icon={<Moon className="h-3.5 w-3.5 text-forest" />}
          />
        </div>
      </div>

      <div>
        <SectionHeader title="About this app" />
        <div className="bg-white border border-line shadow-sm rounded-2xl p-4 text-[11px] text-ink-soft/75 space-y-2">
          <p className="flex items-center gap-2">
            <Smartphone className="h-3.5 w-3.5 text-forest" />
            NL Starter — mobile-first PWA template
          </p>
          <p>
            Design tokens live in <code className="text-ink">src/app/globals.css</code>;
            patterns in <code className="text-ink">docs/DESIGN_SYSTEM.md</code>.
          </p>
        </div>
      </div>

      <Button variant="outline" className="w-full h-12 text-red-600 hover:bg-red-50 hover:text-red-600">
        <LogOut className="h-4 w-4" />
        Sign out
      </Button>
    </div>
  )
}
