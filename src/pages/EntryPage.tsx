import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button, Input, Textarea } from '../components/ui'
import { TimeBlocks } from '../components/TimeBlocks'
import { BookDayLayout } from '../components/BookDayLayout'
import { GoogleCalendarPanel } from '../components/GoogleCalendarPanel'
import type { PdsEntry } from '../types/pds'
import { makeDefaultBlocks } from '../lib/blocks'
import { applyGoogleEventsToHourlyPlan } from '../lib/applyCalendarToPlan'
import { toLocalDateInputValue } from '../lib/time'
import { useEntries } from '../state/EntriesContext'

function parseTags(raw: string): string[] {
  const parts = raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
  // de-dupe, case-insensitive
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

export default function EntryPage({ entryId, initialDate }: { entryId?: string; initialDate?: string }) {
  const nav = useNavigate()
  const id = entryId
  const { getById, upsert, remove, createDraft } = useEntries()

  const existing = useMemo(() => (id ? getById(id) : undefined), [getById, id])

  const [layout, setLayout] = useState<'standard' | 'book'>(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem('pdsdiary:entryLayout') : null
    return raw === 'book' ? 'book' : 'standard'
  })

  const [draft, setDraft] = useState<PdsEntry>(() => {
    if (existing) {
      return {
        ...existing,
        blocks: existing.blocks ?? makeDefaultBlocks(),
        doItems: (existing.doItems ?? ['', '', '']).slice(0, 3),
      }
    }
    const newDraft = createDraft()
    if (initialDate) {
      newDraft.date = initialDate
    }
    newDraft.doItems = ['', '', '']
    return newDraft
  })

  const [status, setStatus] = useState<string | null>(null)

  const isNew = !id

  const onSave = () => {
    const now = new Date().toISOString()
    upsert({
      ...draft,
      // ensure createdAt remains stable for existing entries
      createdAt: isNew ? now : draft.createdAt,
      updatedAt: now,
    })
    setStatus('Saved.')
    if (isNew) nav(`/entry/${draft.id}`, { replace: true })
  }

  const onToggleLayout = () => {
    setLayout((prev) => {
      const next = prev === 'book' ? 'standard' : 'book'
      try {
        window.localStorage.setItem('pdsdiary:entryLayout', next)
      } catch {
        // ignore
      }
      return next
    })
  }

  const onDelete = () => {
    if (!confirm('Delete this entry? This cannot be undone.')) return
    remove(draft.id)
    nav('/')
  }

  const onResetToday = () => {
    setDraft((d) => ({ ...d, date: toLocalDateInputValue(new Date()) }))
  }

  return (
    <div className="min-h-full">
      <Header
        title={isNew ? 'New entry' : 'Edit entry'}
        right={
          <>
            <Link to="/">
              <Button variant="secondary">Back</Button>
            </Link>
            {!isNew ? (
              <Button variant="danger" onClick={onDelete}>
                Delete
              </Button>
            ) : null}
            <Button onClick={onSave}>Save</Button>
          </>
        }
      />

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm font-semibold text-slate-900">Daily entry</div>
            <Button variant="secondary" onClick={onToggleLayout}>
              {layout === 'book' ? 'Standard layout' : 'Book layout'}
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block">
                  <div className="text-xs font-semibold text-slate-700">Title</div>
                  <div className="mt-1">
                    <Input
                      value={draft.title}
                      onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                      placeholder="What is this entry about?"
                    />
                  </div>
                </label>
                <label className="block">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-slate-700">Date</div>
                    <button
                      type="button"
                      onClick={onResetToday}
                      className="text-xs font-medium text-slate-500 hover:text-slate-700"
                    >
                      Today
                    </button>
                  </div>
                  <div className="mt-1">
                    <Input
                      type="date"
                      value={draft.date}
                      onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                    />
                  </div>
                </label>
              </div>

              <div className="text-right text-xs text-slate-600">
                {status ? status : null}
                <div className="mt-1">
                  Created {new Date(draft.createdAt).toLocaleString()}
                  <span className="mx-1">•</span>
                  Updated {new Date(draft.updatedAt).toLocaleString()}
                </div>
              </div>
            </div>

            <label className="mt-4 block">
              <div className="text-xs font-semibold text-slate-700">Tags</div>
              <div className="mt-1">
                <Input
                  value={tagsToString(draft.tags)}
                  onChange={(e) => setDraft((d) => ({ ...d, tags: parseTags(e.target.value) }))}
                  placeholder="comma, separated, tags"
                />
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Tip: tags help searching later (e.g. “health”, “work”, “reflection”).
              </div>
            </label>
          </div>

          {layout === 'book' ? (
            <BookDayLayout
              date={draft.date}
              blocks={draft.blocks ?? makeDefaultBlocks()}
              see={draft.see}
              onChangeBlocks={(next) => setDraft((d) => ({ ...d, blocks: next }))}
              onChangeSee={(next) => setDraft((d) => ({ ...d, see: next }))}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">Plan</div>
                  <div className="mt-1 text-xs text-slate-600">What do you intend to do?</div>
                  <div className="mt-3">
                    <Textarea
                      value={draft.plan}
                      onChange={(e) => setDraft((d) => ({ ...d, plan: e.target.value }))}
                      placeholder="Example: Write 30 minutes, then review yesterday’s notes…"
                    />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">Do</div>
                  <div className="mt-1 text-xs text-slate-600">What did you actually do? (3 items)</div>
                  <div className="mt-3 space-y-2">
                    {(draft.doItems ?? ['', '', '']).slice(0, 3).map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                          {index + 1}
                        </div>
                        <div className="text-xs font-semibold text-slate-700">Do</div>
                      </div>
                      <Input
                        value={item}
                        onChange={(e) => {
                          const newItems = [...(draft.doItems ?? ['', '', ''])]
                          newItems[index] = e.target.value
                          setDraft((d) => ({ ...d, doItems: newItems }))
                        }}
                        placeholder={`What did you do?`}
                      />
                    </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="text-sm font-semibold text-slate-900">See</div>
                  <div className="mt-1 text-xs text-slate-600">What did you observe/learn?</div>
                  <div className="mt-3">
                    <Textarea
                      value={draft.see}
                      onChange={(e) => setDraft((d) => ({ ...d, see: e.target.value }))}
                      placeholder="Example: Timer helps; writing earlier reduces distractions…"
                    />
                  </div>
                </section>
              </div>

              <TimeBlocks
                blocks={draft.blocks ?? makeDefaultBlocks()}
                onChange={(next) => setDraft((d) => ({ ...d, blocks: next }))}
              />
            </>
          )}

          <GoogleCalendarPanel
            date={draft.date}
            onApplyToPlan={(events) => {
              setDraft((d) => ({
                ...d,
                blocks: applyGoogleEventsToHourlyPlan({
                  date: d.date,
                  blocks: d.blocks ?? makeDefaultBlocks(),
                  events,
                }),
              }))
            }}
          />

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-xs text-slate-600">
                Your entries are stored locally in this browser (LocalStorage).
              </div>
              <div className="flex gap-2">
                {!isNew ? (
                  <Button variant="danger" onClick={onDelete}>
                    Delete entry
                  </Button>
                ) : null}
                <Button onClick={onSave}>Save entry</Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

