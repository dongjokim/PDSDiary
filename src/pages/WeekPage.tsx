import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button, Input, Textarea } from '../components/ui'
import { TimeBlocks } from '../components/TimeBlocks'
import { TagPicker } from '../components/TagPicker'
import type { PdsEntry } from '../types/pds'
import { makeDefaultBlocks } from '../lib/blocks'
import { toLocalDateInputValue } from '../lib/time'
import { inferCategory } from '../lib/inferCategory'
import { clsx } from '../lib/clsx'
import { categoryColorClass } from '../lib/categoryColors'
import { useEntries } from '../state/EntriesContext'

type DoCategory = NonNullable<PdsEntry['doItemCategories']>[number]

function parseTags(raw: string): string[] {
  const normalized = raw.replace(/#/g, ' ')
  const parts = normalized
    .split(/[,\n]+/)
    .flatMap((chunk) => chunk.split(/\s+/))
    .map((t) => t.trim())
    .filter(Boolean)
  const seen = new Set<string>()
  const out: string[] = []
  for (const t of parts) {
    const key = t.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(t)
  }
  return out
}

function tagsToString(tags: string[]): string {
  return tags.join(', ')
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun
  const diff = day === 0 ? -6 : 1 - day // Monday start
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function formatRangeLabel(start: Date, days: number): string {
  const end = addDays(start, days - 1)
  return `${start.toLocaleDateString()} – ${end.toLocaleDateString()}`
}

function buildDraftForDate(
  date: string,
  existing: PdsEntry | undefined,
  createDraft: () => PdsEntry,
): PdsEntry {
  if (existing) {
    return {
      ...existing,
      blocks: existing.blocks ?? makeDefaultBlocks(),
      doItems: (existing.doItems ?? ['', '', '']).slice(0, 3),
      doItemCategories: (existing.doItemCategories ?? ['', '', '']).slice(0, 3),
      doItemProjectTags: (existing.doItemProjectTags ?? ['', '', '']).slice(0, 3),
    }
  }
  const draft = createDraft()
  draft.date = date
  draft.doItems = ['', '', '']
  draft.doItemCategories = ['', '', '']
  draft.doItemProjectTags = ['', '', '']
  return draft
}

function applyInferredCategories(entry: PdsEntry): PdsEntry {
  let changed = false
  const doItems = entry.doItems ?? []
  const doItemCategories = (entry.doItemCategories ?? ['', '', '']) as DoCategory[]

  doItems.slice(0, 3).forEach((item, idx) => {
    if (doItemCategories[idx]) return
    const inferred = inferCategory(item ?? '')
    if (inferred) {
      doItemCategories[idx] = inferred
      changed = true
    }
  })

  const blocks = entry.blocks
    ? entry.blocks.map((b) => {
        if (b.category) return b
        const inferred = inferCategory(b.do ?? '') || inferCategory(b.plan ?? '')
        if (!inferred) return b
        changed = true
        return { ...b, category: inferred }
      })
    : undefined

  if (!changed) return entry
  return {
    ...entry,
    doItemCategories,
    blocks,
  }
}

export default function WeekPage() {
  const { entries, upsert, createDraft } = useEntries()
  const [anchorDate, setAnchorDate] = useState<Date>(() => new Date())
  const [drafts, setDrafts] = useState<Record<string, PdsEntry>>({})
  const [statusByDate, setStatusByDate] = useState<Record<string, string>>({})
  const rangeDays = 3

  const rangeStart = useMemo(() => startOfWeek(anchorDate), [anchorDate])
  const rangeDates = useMemo(
    () => Array.from({ length: rangeDays }, (_, i) => toLocalDateInputValue(addDays(rangeStart, i))),
    [rangeStart, rangeDays],
  )
  const entriesByDate = useMemo(() => new Map(entries.map((e) => [e.date, e])), [entries])

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev }
      rangeDates.forEach((date) => {
        const existing = entriesByDate.get(date)
        if (!next[date] || (existing && next[date].id !== existing.id)) {
          next[date] = buildDraftForDate(date, existing, createDraft)
        }
      })
      return next
    })
  }, [rangeDates, entriesByDate, createDraft])

  const tagSuggestions = useMemo(
    () => Array.from(new Set(entries.flatMap((e) => e.tags).map((t) => t.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [entries],
  )

  const updateDraft = (date: string, updater: (prev: PdsEntry) => PdsEntry) => {
    setDrafts((prev) => {
      const current = prev[date]
      if (!current) return prev
      return { ...prev, [date]: updater(current) }
    })
  }

  const saveDay = (date: string) => {
    const draft = drafts[date]
    if (!draft) return
    const now = new Date().toISOString()
    const withCategories = applyInferredCategories(draft)
    setDrafts((prev) => ({ ...prev, [date]: withCategories }))
    upsert({
      ...withCategories,
      createdAt: draft.createdAt,
      updatedAt: now,
    })
    setStatusByDate((prev) => ({ ...prev, [date]: 'Saved.' }))
  }

  const saveAll = () => {
    rangeDates.forEach((d) => saveDay(d))
  }

  return (
    <div className="min-h-full">
      <Header
        title="3-day view"
        right={
          <>
            <Link to="/">
              <Button variant="secondary">Home</Button>
            </Link>
            <Button variant="secondary" onClick={() => setAnchorDate(new Date())}>
              Today
            </Button>
            <Button variant="secondary" onClick={() => setAnchorDate(addDays(anchorDate, -rangeDays))}>
              ← 3 days
            </Button>
            <Button variant="secondary" onClick={() => setAnchorDate(addDays(anchorDate, rangeDays))}>
              3 days →
            </Button>
            <Button onClick={saveAll}>Save all</Button>
          </>
        }
      />

      <main className="mx-auto w-full max-w-none px-4 py-6 sm:px-6">
        <div className="mb-4 text-sm font-semibold text-slate-700">
          {formatRangeLabel(rangeStart, rangeDays)}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {rangeDates.map((date) => {
              const draft = drafts[date]
              if (!draft) return null
              const existing = entriesByDate.get(date)
              const link = existing ? `/entry/${existing.id}` : `/new?date=${date}`
              const weekday = new Date(date).toLocaleDateString(undefined, { weekday: 'long' })
              return (
                <section key={date} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {weekday} • {date}
                      </div>
                      <div className="mt-1 text-xs text-slate-600">
                        {statusByDate[date] ?? ''}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link to={link}>
                        <Button variant="secondary" size="sm">Open</Button>
                      </Link>
                      <Button size="sm" onClick={() => saveDay(date)}>Save</Button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="block">
                      <div className="text-xs font-semibold text-slate-700">Title</div>
                      <div className="mt-1">
                        <Input
                          value={draft.title}
                          onChange={(e) => updateDraft(date, (d) => ({ ...d, title: e.target.value }))}
                          placeholder="What is this entry about?"
                        />
                      </div>
                    </label>
                    <label className="block">
                      <div className="text-xs font-semibold text-slate-700">Tags</div>
                      <div className="mt-1">
                        <Input
                          value={tagsToString(draft.tags)}
                          onChange={(e) => updateDraft(date, (d) => ({ ...d, tags: parseTags(e.target.value) }))}
                          placeholder="comma or space separated tags"
                        />
                      </div>
                      <div className="mt-2">
                        <TagPicker
                          value={draft.tags}
                          suggestions={tagSuggestions}
                          onChange={(next) => updateDraft(date, (d) => ({ ...d, tags: next }))}
                        />
                      </div>
                    </label>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <section className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="text-xs font-semibold text-slate-700">Plan</div>
                      <div className="mt-2">
                        <Textarea
                          value={draft.plan}
                          onChange={(e) => updateDraft(date, (d) => ({ ...d, plan: e.target.value }))}
                          placeholder="What do you intend to do?"
                        />
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="text-xs font-semibold text-slate-700">Do (3 items)</div>
                      <div className="mt-2 space-y-2">
                        {(draft.doItems ?? ['', '', '']).slice(0, 3).map((item, index) => (
                          <div key={index} className="flex flex-col gap-2 rounded-lg bg-slate-50 p-2 ring-1 ring-slate-200">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                                {index + 1}
                              </div>
                              <div className="text-xs font-semibold text-slate-700">Do</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {(() => {
                                const categories = (draft.doItemCategories ?? ['', '', '']) as DoCategory[]
                                const currentCategory = categories[index] ?? ''
                                return (
                                  <>
                                    <select
                                      value={currentCategory}
                                      onChange={(e) => {
                                        const next = [...categories]
                                        const v = e.target.value as DoCategory
                                        next[index] = v
                                        const tagNext = [...(draft.doItemProjectTags ?? ['', '', ''])]
                                        tagNext[index] = v === 'project' ? tagNext[index] : ''
                                        updateDraft(date, (d) => ({ ...d, doItemCategories: next, doItemProjectTags: tagNext }))
                                      }}
                                      className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
                                    >
                                      <option value="">—</option>
                                      <option value="project">Project</option>
                                      <option value="exercise">Exercise</option>
                                      <option value="family">Family</option>
                                      <option value="meeting">Meeting</option>
                                      <option value="wellbeing">Well-being</option>
                                      <option value="sleep">Sleep</option>
                                      <option value="food">Food</option>
                                      <option value="entertainment">Entertainment</option>
                                    </select>
                                    {currentCategory === 'project' ? (
                                      <Input
                                        value={(draft.doItemProjectTags ?? ['', '', ''])[index] ?? ''}
                                        onChange={(e) => {
                                          const tagNext = [...(draft.doItemProjectTags ?? ['', '', ''])]
                                          tagNext[index] = e.target.value
                                          updateDraft(date, (d) => ({ ...d, doItemProjectTags: tagNext }))
                                        }}
                                        placeholder="Project tag…"
                                        className="h-8"
                                      />
                                    ) : null}
                                  </>
                                )
                              })()}
                            </div>

                            <div className="flex items-center gap-2">
                              {(() => {
                                const categories = (draft.doItemCategories ?? ['', '', '']) as DoCategory[]
                                const currentCategory = categories[index] ?? ''
                                return currentCategory ? (
                                  <span
                                    className={clsx(
                                      'h-3 w-3 rounded-full',
                                      categoryColorClass(
                                        currentCategory,
                                        (draft.doItemProjectTags ?? ['', '', ''])[index] ?? '',
                                      ),
                                    )}
                                  />
                                ) : null
                              })()}
                              <Input
                                value={item}
                                onChange={(e) => {
                                  const value = e.target.value
                                  const newItems = [...(draft.doItems ?? ['', '', ''])]
                                  newItems[index] = value
                                  const categories = (draft.doItemCategories ?? ['', '', '']) as DoCategory[]
                                  if (!categories[index]) {
                                    const inferred = inferCategory(value)
                                    if (inferred) {
                                      categories[index] = inferred
                                    }
                                  }
                                  updateDraft(date, (d) => ({ ...d, doItems: newItems, doItemCategories: categories }))
                                }}
                                placeholder="What did you do?"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-white p-3">
                      <div className="text-xs font-semibold text-slate-700">See</div>
                      <div className="mt-2">
                        <Textarea
                          value={draft.see}
                          onChange={(e) => updateDraft(date, (d) => ({ ...d, see: e.target.value }))}
                          placeholder="What did you observe/learn?"
                        />
                      </div>
                    </section>
                  </div>

                  <div className="mt-4">
                    <TimeBlocks
                      blocks={draft.blocks ?? makeDefaultBlocks()}
                      onChange={(next) => updateDraft(date, (d) => ({ ...d, blocks: next }))}
                    />
                  </div>
                </section>
              )
          })}
        </div>
      </main>
    </div>
  )
}

