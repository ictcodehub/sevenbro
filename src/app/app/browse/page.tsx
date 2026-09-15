"use client"

import { useState } from "react"
import { Bookmark, Calendar, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { SectionHeader, ListRow, EmptyState } from "@/components/ui-primitives"
import { FEED } from "@/lib/demo-data"

export default function BrowsePage() {
  const [tab, setTab] = useState("all")

  const today = FEED.filter((f) => f.date === "Oct 14")
  const later = FEED.filter((f) => f.date !== "Oct 14")

  return (
    <div className="px-4 py-3 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Browse</h1>
        <p className="text-[11px] text-ink-soft/75">Tabs · Badge · Button · ListRow demo</p>
      </div>

      {/* ── Tabs (ui/tabs) ── */}
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full h-auto">
          <TabsTrigger value="all" className="flex-1">All</TabsTrigger>
          <TabsTrigger value="today" className="flex-1">Today</TabsTrigger>
          <TabsTrigger value="later" className="flex-1">Later</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="space-y-1.5">
            {FEED.map((item) => (
              <ListRow
                key={item.id}
                icon={<Calendar className="h-3.5 w-3.5 text-forest" />}
                title={item.title}
                subtitle={item.subtitle}
                rightTop={item.time}
                rightBottom={item.date}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="today">
          <div className="space-y-1.5">
            {today.map((item) => (
              <ListRow
                key={item.id}
                icon={<Calendar className="h-3.5 w-3.5 text-forest" />}
                title={item.title}
                subtitle={item.subtitle}
                rightTop={item.time}
                rightBottom={item.date}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="later">
          {later.length === 0 ? (
            <EmptyState icon={<Search className="h-5 w-5" />} message="Nothing scheduled later" />
          ) : (
            <div className="space-y-1.5">
              {later.map((item) => (
                <ListRow
                  key={item.id}
                  icon={<Calendar className="h-3.5 w-3.5 text-forest" />}
                  title={item.title}
                  subtitle={item.subtitle}
                  rightTop={item.time}
                  rightBottom={item.date}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Badges (ui/badge) ── */}
      <div>
        <SectionHeader title="Badges" count="6" />
        <div className="bg-white border border-line shadow-sm rounded-2xl p-3 flex flex-wrap gap-2">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="info">Info</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </div>

      {/* ── Buttons (ui/button) ── */}
      <div>
        <SectionHeader title="Buttons" />
        <div className="bg-white border border-line shadow-sm rounded-2xl p-3 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="destructive">Delete</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm">Small</Button>
            <Button size="icon" aria-label="Bookmark">
              <Bookmark className="h-4 w-4" />
            </Button>
            <Button size="lg" className="flex-1">Large</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
