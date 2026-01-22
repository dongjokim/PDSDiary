import type { PdsEntry } from '../types/pds'
import { Input } from './ui'
import { clsx } from '../lib/clsx'
import { TickBar } from './TickBar'

type Block = NonNullable<PdsEntry['blocks']>[number]

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
                    <div className="flex items-center gap-2">
                      <TickBar
                        value={b.doTicks ?? 0}
                        onChange={(v) => {
                          onChange(blocks.map((x, i) => (i === idx ? { ...x, doTicks: v || undefined } : x)))
                        }}
                        segments={6}
                        label={`Do ticks at ${b.t}`}
                      />
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

