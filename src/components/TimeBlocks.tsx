import type { PdsEntry } from '../types/pds'
import { Input } from './ui'
import { clsx } from '../lib/clsx'
import { TickBar } from './TickBar'

type Block = NonNullable<PdsEntry['blocks']>[number]

const CATEGORY_OPTIONS = [
  { value: '', label: '—' },
  { value: 'project', label: 'Project' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'family', label: 'Family' },
  { value: 'meeting', label: 'Meeting' },
] as const

const COLOR_OPTIONS = [
  { value: 'blue', label: 'Blue', className: 'bg-blue-500' },
  { value: 'green', label: 'Green', className: 'bg-emerald-500' },
  { value: 'purple', label: 'Purple', className: 'bg-purple-500' },
  { value: 'orange', label: 'Orange', className: 'bg-orange-500' },
  { value: 'pink', label: 'Pink', className: 'bg-pink-500' },
  { value: 'teal', label: 'Teal', className: 'bg-teal-500' },
] as const

function colorClass(value?: Block['color']) {
  const hit = COLOR_OPTIONS.find((c) => c.value === value)
  return hit?.className ?? 'bg-slate-300'
}

export function TimeBlocks({
  blocks,
  onChange,
}: {
  blocks: Block[]
  onChange: (next: Block[]) => void
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="text-sm font-semibold text-slate-900">24 hours • Hourly tracking</div>
        <div className="mt-1 text-xs text-slate-600">
          Use <span className="font-semibold">Plan</span> to schedule, then fill the{' '}
          <span className="font-semibold">Do</span> bar (6 ticks = 60m) and add a short comment.
        </div>
      </div>

      <div className="max-h-[70vh] overflow-auto">
        <div className="sticky top-0 z-10 grid grid-cols-[72px_1fr_1fr] gap-2 border-b border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700">
          <div>Time</div>
          <div>Plan</div>
          <div>Do (0–60m)</div>
        </div>

        <div className="px-4 py-3">
          <div className="grid grid-cols-1 gap-2">
            {blocks.map((b, idx) => {
              const planId = `plan-${b.t}`
              const doId = `do-${b.t}`
              return (
                <div key={b.t} className="grid grid-cols-[72px_1fr_1fr] items-center gap-2">
                  <div className="text-xs font-medium text-slate-600 tabular-nums">{b.t}</div>
                  <div>
                    <label htmlFor={planId} className="sr-only">
                      Plan at {b.t}
                    </label>
                    <Input
                      id={planId}
                      value={b.plan ?? ''}
                      onChange={(e) => {
                        const v = e.target.value
                        onChange(
                          blocks.map((x, i) => (i === idx ? { ...x, plan: v || undefined } : x)),
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
                                      color: v === 'project' ? x.color : undefined,
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
                          <div className="flex items-center gap-1">
                            {COLOR_OPTIONS.map((c) => (
                              <button
                                key={c.value}
                                type="button"
                                onClick={() => {
                                  onChange(blocks.map((x, i) => (i === idx ? { ...x, color: c.value } : x)))
                                }}
                                className={clsx(
                                  'h-4 w-4 rounded-full ring-1 ring-slate-300',
                                  c.className,
                                  b.color === c.value ? 'ring-2 ring-slate-700' : '',
                                )}
                                title={c.label}
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        {b.category === 'project' && b.color ? (
                          <span className={clsx('h-3 w-3 rounded-full', colorClass(b.color))} />
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
                          onChange(blocks.map((x, i) => (i === idx ? { ...x, do: v || undefined } : x)))
                        }}
                        placeholder="Comment…"
                        className={clsx(b.do ? '' : 'placeholder:text-slate-300')}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

