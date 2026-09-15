"use client"

import { Bell, Calendar, Clock, Inbox, MapPin } from "lucide-react"
import {
  SectionHeader,
  StatCard,
  ListRow,
  HeroCard,
  ProgressCard,
} from "@/components/ui-primitives"
import { FEED } from "@/lib/demo-data"

export default function HomePage() {
  const upcoming = FEED.slice(0, 3)

  return (
    <div className="px-4 py-3 space-y-4">
      {/* ── Greeting ── */}
      <div>
        <h1 className="text-lg font-bold text-ink">Hi there! 👋</h1>
        <p className="text-[11px] text-ink-soft/75">Welcome to your NL Starter app</p>
      </div>

      {/* ── Quick stats (StatCard) ── */}
      <div className="flex gap-2">
        <StatCard
          href="/app/browse"
          icon={<Inbox className="h-4 w-4" />}
          label="Browse"
          value={`${FEED.length} items`}
          tone="forest"
        />
        <StatCard
          href="/app/activity"
          icon={<Bell className="h-4 w-4" />}
          label="Activity"
          value="3 events"
          tone="amber"
        />
      </div>

      {/* ── Dark hero card ── */}
      <HeroCard
        eyebrow="Happening now"
        meta="09:00 — 10:00"
        title="Morning sync"
        location="Room A"
        description="Replace this hero with your live state — the card is fully prop-driven."
      />

      {/* ── Progress card ── */}
      <ProgressCard
        eyebrow={
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Onboarding
          </span>
        }
        value={60}
        sub="%"
        percent={60}
        doneLabel="3/5 done"
      />

      {/* ── Upcoming list (SectionHeader + ListRow) ── */}
      <div>
        <SectionHeader
          title="Upcoming"
          action={{ href: "/app/browse", label: "See all" }}
        />
        <div className="space-y-1.5">
          {upcoming.map((item) => (
            <ListRow
              key={item.id}
              icon={<Calendar className="h-3.5 w-3.5 text-forest" />}
              title={item.title}
              subtitle={item.subtitle}
              rightTop={item.time}
              rightBottom={item.date}
              href="/app/browse"
            />
          ))}
        </div>
      </div>

      {/* ── Empty state demo ── */}
      <div>
        <SectionHeader title="Empty state" count="0" />
        <div className="bg-white border border-line shadow-sm rounded-2xl py-6 text-center">
          <div className="flex justify-center mb-1 text-ink-soft/40">
            <MapPin className="h-5 w-5" />
          </div>
          <p className="text-[11px] text-ink-soft/75">
            Nothing here yet — wire up your data
          </p>
        </div>
      </div>
    </div>
  )
}
