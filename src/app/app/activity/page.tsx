"use client"

import { Bell, Calendar } from "lucide-react"
import { SectionHeader, ListRow } from "@/components/ui-primitives"
import { FEED } from "@/lib/demo-data"

export default function ActivityPage() {
  return (
    <div className="px-4 py-3 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Activity</h1>
        <p className="text-[11px] text-ink-soft/75">Recent events across the app</p>
      </div>

      <div>
        <SectionHeader title="This week" count={String(FEED.length)} />
        <div className="space-y-1.5">
          {FEED.map((item) => (
            <ListRow
              key={item.id}
              icon={
                item.id === "f1" ? (
                  <Bell className="h-3.5 w-3.5 text-amber" />
                ) : (
                  <Calendar className="h-3.5 w-3.5 text-forest" />
                )
              }
              title={item.title}
              subtitle={item.subtitle}
              rightTop={item.time}
              rightBottom={item.date}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
