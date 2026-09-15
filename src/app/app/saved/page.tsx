"use client"

import { useState } from "react"
import { Pencil, Trash2 } from "lucide-react"
import { SwipeRow } from "@/components/admin/SwipeRow"
import { SectionHeader, EmptyState } from "@/components/ui-primitives"
import { SAVED } from "@/lib/demo-data"

export default function SavedPage() {
  const [items, setItems] = useState(SAVED)
  const [openId, setOpenId] = useState<string | null>(null)

  if (items.length === 0) {
    return (
      <div className="px-4 py-3 space-y-4">
        <div>
          <h1 className="text-lg font-bold text-ink">Saved</h1>
          <p className="text-[11px] text-ink-soft/75">Swipe demo — gone when empty</p>
        </div>
        <EmptyState icon={<Trash2 className="h-5 w-5" />} message="No saved items" />
      </div>
    )
  }

  return (
    <div className="px-4 py-3 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-ink">Saved</h1>
        <p className="text-[11px] text-ink-soft/75">
          Swipe a row left on touch — Edit / Delete actions appear
        </p>
      </div>

      <div>
        <SectionHeader title="All saved" count={String(items.length)} />
        <div className="space-y-1.5">
          {items.map((item) => (
            <SwipeRow
              key={item.id}
              open={openId === item.id}
              setOpen={(v) => setOpenId(v ? item.id : null)}
              onEdit={() => {
                setOpenId(null)
                /* wire your edit modal here */
              }}
              onDelete={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
              onOpen={() => {
                /* tap row body — open detail */
              }}
            >
              <div className="bg-white border border-line shadow-sm rounded-xl p-2.5 flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface shrink-0">
                  <Pencil className="h-3.5 w-3.5 text-ink-soft" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-ink truncate">{item.title}</p>
                  <p className="text-[10px] text-ink-soft/75 truncate">
                    {item.subtitle} · {item.tag}
                  </p>
                </div>
              </div>
            </SwipeRow>
          ))}
        </div>
      </div>
    </div>
  )
}
