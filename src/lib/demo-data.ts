// ============================================================
// Demo data — replace with your real data layer (API/DB/etc.)
// ============================================================

export type FeedItem = {
  id: string
  title: string
  subtitle: string
  time: string
  date: string
}

export type SavedItem = {
  id: string
  title: string
  subtitle: string
  tag: string
}

export type AppNotification = {
  id: string
  kind: "update" | "reminder" | "alert"
  title: string
  body: string
  href?: string
}

export const FEED: FeedItem[] = [
  { id: "f1", title: "Morning sync", subtitle: "Room A", time: "09:00", date: "Oct 14" },
  { id: "f2", title: "Design review", subtitle: "Room B", time: "11:30", date: "Oct 14" },
  { id: "f3", title: "Team lunch", subtitle: "Cafeteria", time: "12:30", date: "Oct 14" },
  { id: "f4", title: "Sprint retro", subtitle: "Room A", time: "15:00", date: "Oct 15" },
  { id: "f5", title: "1:1 with mentor", subtitle: "Room C", time: "16:30", date: "Oct 15" },
]

export const SAVED: SavedItem[] = [
  { id: "s1", title: "Onboarding flow v2", subtitle: "Design", tag: "In progress" },
  { id: "s2", title: "API contract notes", subtitle: "Docs", tag: "Draft" },
  { id: "s3", title: "Q4 roadmap draft", subtitle: "Planning", tag: "Review" },
]

export const NOTIFICATIONS: AppNotification[] = [
  { id: "n1", kind: "update", title: "New comment", body: "Andi commented on Onboarding flow v2", href: "/app/browse" },
  { id: "n2", kind: "reminder", title: "Sprint retro tomorrow", body: "15:00 · Room A", href: "/app/activity" },
  { id: "n3", kind: "alert", title: "Storage almost full", body: "Add a backend before deploying", href: "/app/settings" },
]
