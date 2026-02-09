import { useEffect } from 'react'
import type { PdsEntry } from '../types/pds'
import { Input } from './ui'
import { clsx } from '../lib/clsx'
import { TickBar } from './TickBar'
import { categoryColorClass } from '../lib/categoryColors'
import { inferCategory } from '../lib/inferCategory'

type Block = NonNullable<PdsEntry['blocks']>[number]

const CATEGORY_OPTIONS = [
  { value: '', label: '—' },
  { value: 'project', label: 'Project' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'family', label: 'Family' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'wellbeing', label: 'Well-being' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'food', label: 'Food' },
  { value: 'entertainment', label: 'Entertainment' },
] as const

export function TimeBlocks({
  blocks,
  onChange,
  variant = 'default',
}: {
  blocks: Block[]
  onChange: (next: Block[]) => void
  variant?: 'default' | 'compact'
}) {
  const isCompact = variant === 'compact'

  useEffect(() => {
    let changed = false
    const next = blocks.map((b) => {
      if (b.category) return b
      const inferred = inferCategory(b.plan ?? '') || inferCategory(b.do ?? '')
      if (!inferred) return b
      changed = true
      return { ...b, category: inferred }
    })
    if (changed) onChange(next)
  }, [blocks, onChange])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="text-sm font-semibold text-slate-900">24 hours • Hourly tracking</div>
        <div className="mt-1 text-xs text-slate-600">
          {isCompact ? (
            <>Check the <span className="font-semibold">Do</span> box and add a short comment.</>
          ) : (
            <>
              Use <span className="font-semibold">Plan</span> to schedule, then fill the{' '}
              <span className="font-semibold">Do</span> bar (6 ticks = 60m) and add a short comment.
            </>
          )}
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto">
        {isCompact ? (
          <div className="sticky top-0 z-10 grid grid-cols-[72px_1fr] gap-2 border-b border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">
            <div>Time</div>
            <div>Do / Plan</div>
          </div>
        ) : (
          <div className="sticky top-0 z-10 grid grid-cols-[72px_1fr_1fr] gap-2 border-b border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">
            <div>Time</div>
            <div>Plan</div>
            <div>Do (0–60m)</div>
          </div>
        )}

        <div className="px-4 py-3">
          <div className="grid grid-cols-1 gap-2">
            {blocks.map((b, idx) => {
              const planId = `plan-${b.t}`
              const doId = `do-${b.t}`
              return (
                <div
                  key={b.t}
                  className={clsx(
                    'grid items-start gap-2',
                    isCompact ? 'grid-cols-[72px_1fr]' : 'grid-cols-[72px_1fr_1fr]',
                  )}
                >
                  <div className="text-xs font-medium text-slate-600 tabular-nums">{b.t}</div>
                  {isCompact ? (
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={b.category ?? ''}
                          onChange={(e) => {
                            const v = e.target.value as Block['category']
                            onChange(
                              blocks.map((x, i) =>
                                i === idx
                                  ? {
                                      ...x,
                                      category: v || undefined,
                                      projectTag: v === 'project' ? x.projectTag : undefined,
                                    }
                                  : x,
                              ),
                            )
                          }}
                          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
                        >
                          {CATEGORY_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {b.category === 'project' ? (
                          <Input
                            value={b.projectTag ?? ''}
                            onChange={(e) => {
                              const v = e.target.value
                              onChange(blocks.map((x, i) => (i === idx ? { ...x, projectTag: v || undefined } : x)))
                            }}
                            placeholder="Project tag…"
                            className="h-8 max-w-[180px]"
                          />
                        ) : null}
                        {b.category ? (
                          <span className={clsx('h-3 w-3 rounded-full', categoryColorClass(b.category, b.projectTag))} />
                        ) : null}
                        <label className="flex items-center gap-2 text-xs text-slate-700">
                          <input
                            type="checkbox"
                            checked={Boolean(b.doTicks)}
                            onChange={(e) => {
                              const next = e.target.checked ? 6 : 0
                              onChange(blocks.map((x, i) => (i === idx ? { ...x, doTicks: next || undefined } : x)))
                            }}
                          />
                          Do
                        </label>
                        <Input
                          id={doId}
                          value={b.do ?? ''}
                          onChange={(e) => {
                            const v = e.target.value
                            const inferred = b.category ? b.category : inferCategory(v)
                            onChange(
                              blocks.map((x, i) =>
                                i === idx
                                  ? { ...x, do: v || undefined, category: inferred || x.category }
                                  : x,
                              ),
                            )
                          }}
                          placeholder="Comment…"
                          className={clsx('h-8 max-w-[220px]', b.do ? '' : 'placeholder:text-slate-300')}
                        />
                      </div>
                      <div className="mt-2">
                        <label htmlFor={planId} className="sr-only">
                          Plan at {b.t}
                        </label>
                        <Input
                          id={planId}
                          value={b.plan ?? ''}
                          onChange={(e) => {
                            const v = e.target.value
                            const inferred = b.category ? b.category : inferCategory(v)
                            onChange(
                              blocks.map((x, i) =>
                                i === idx
                                  ? { ...x, plan: v || undefined, category: inferred || x.category }
                                  : x,
                              ),
                            )
                          }}
                          placeholder="Plan…"
                          className={clsx('h-8 max-w-[220px]', b.plan ? '' : 'placeholder:text-slate-300')}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label htmlFor={planId} className="sr-only">
                          Plan at {b.t}
                        </label>
                        <Input
                          id={planId}
                          value={b.plan ?? ''}
                          onChange={(e) => {
                            const v = e.target.value
                            const inferred = b.category ? b.category : inferCategory(v)
                            onChange(
                              blocks.map((x, i) =>
                                i === idx
                                  ? { ...x, plan: v || undefined, category: inferred || x.category }
                                  : x,
                              ),
                            )
                          }}
                          placeholder="Planned activity…"
                          className={clsx(b.plan ? '' : 'placeholder:text-slate-300')}
                        />
                      </div>
                      <div>
                        <label htmlFor={doId} className="sr-only">
                          Do at {b.t} (ticks + comment)
                        </label>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <select
                              value={b.category ?? ''}
                              onChange={(e) => {
                                const v = e.target.value as Block['category']
                                onChange(
                                  blocks.map((x, i) =>
                                    i === idx
                                      ? {
                                          ...x,
                                          category: v || undefined,
                                          projectTag: v === 'project' ? x.projectTag : undefined,
                                        }
                                      : x,
                                  ),
                                )
                              }}
                              className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700"
                            >
                              {CATEGORY_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                            {b.category === 'project' ? (
                              <Input
                                value={b.projectTag ?? ''}
                                onChange={(e) => {
                                  const v = e.target.value
                                  onChange(blocks.map((x, i) => (i === idx ? { ...x, projectTag: v || undefined } : x)))
                                }}
                                placeholder="Project tag…"
                                className="h-8"
                              />
                            ) : null}
                          </div>

                          <div className="flex items-center gap-2">
                            {b.category ? (
                              <span className={clsx('h-3 w-3 rounded-full', categoryColorClass(b.category, b.projectTag))} />
                            ) : null}
                            <TickBar
                              value={b.doTicks ?? 0}
                              onChange={(v) => {
                                onChange(blocks.map((x, i) => (i === idx ? { ...x, doTicks: v || undefined } : x)))
                              }}
                              segments={6}
                              label={`Do ticks at ${b.t}`}
                            />
                          </div>
                          <Input
                            id={doId}
                            value={b.do ?? ''}
                            onChange={(e) => {
                              const v = e.target.value
                              const inferred = b.category ? b.category : inferCategory(v)
                              onChange(
                                blocks.map((x, i) =>
                                  i === idx
                                    ? { ...x, do: v || undefined, category: inferred || x.category }
                                    : x,
                                ),
                              )
                            }}
                            onBlur={(e) => {
                              const v = e.target.value
                              if (b.category) return
                              const inferred = inferCategory(v)
                              if (!inferred) return
                              onChange(
                                blocks.map((x, i) =>
                                  i === idx
                                    ? { ...x, category: inferred }
                                    : x,
                                ),
                              )
                            }}
                            placeholder="Comment…"
                            className={clsx(b.do ? '' : 'placeholder:text-slate-300')}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

