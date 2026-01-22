import { Textarea } from './ui'
import type { PdsEntry } from '../types/pds'

type Block = NonNullable<PdsEntry['blocks']>[number]

const BOOK_ORDER_HOURS: number[] = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2,
]

function toHH00(hour: number): string {
  return `${String(hour).padStart(2, '0')}:00`
}

function bookTimeLabel(hour: number): string {
  if (hour === 3) return '3am'
  if (hour >= 4 && hour <= 11) return String(hour)
  if (hour === 12) return '12 pm'
  if (hour >= 13 && hour <= 23) return String(hour - 12)
  if (hour === 0) return '12 am'
  return String(hour)
}

function weekdayLabel(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map((s) => Number(s))
  if (!y || !m || !d) return yyyyMmDd
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString(undefined, { weekday: 'long' }).toUpperCase()
}

export function BookDayLayout({
  date,
  blocks,
  see,
  onChangeBlocks,
  onChangeSee,
}: {
  date: string
  blocks: Block[]
  see: string
  onChangeBlocks: (next: Block[]) => void
  onChangeSee: (next: string) => void
}) {
  const byTime = new Map(blocks.map((b) => [b.t, b] as const))

  const setCell = (t: string, field: 'plan' | 'do', value: string) => {
    onChangeBlocks(
      blocks.map((b) => {
        if (b.t !== t) return b
        return { ...b, [field]: value.trim() ? value : undefined }
      }),
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-baseline justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="text-xl font-semibold tracking-wide text-slate-900">{weekdayLabel(date)}</div>
        <div className="text-sm font-medium tabular-nums text-slate-600">{date}</div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-300">
        <div className="grid grid-cols-[72px_1fr_1fr] border-b border-slate-300 bg-slate-50 text-xs font-semibold text-slate-800">
          <div className="px-3 py-2" />
          <div className="border-l border-slate-300 px-3 py-2 text-center">Plan</div>
          <div className="border-l border-slate-300 px-3 py-2 text-center">Do</div>
        </div>

        <div className="grid grid-cols-1">
          {BOOK_ORDER_HOURS.map((h) => {
            const t = toHH00(h)
            const b = byTime.get(t) ?? { t }
            const planId = `book-plan-${date}-${t}`
            const doId = `book-do-${date}-${t}`
            return (
              <div key={t} className="grid grid-cols-[72px_1fr_1fr] border-b border-slate-200 last:border-b-0">
                <div className="px-3 py-2 text-xs font-medium text-slate-600 tabular-nums">{bookTimeLabel(h)}</div>
                <div className="border-l border-slate-200">
                  <label htmlFor={planId} className="sr-only">
                    Plan at {t}
                  </label>
                  <input
                    id={planId}
                    value={b.plan ?? ''}
                    onChange={(e) => setCell(t, 'plan', e.target.value)}
                    placeholder=""
                    className="h-full w-full bg-transparent px-3 py-2 text-sm text-slate-900 outline-none focus:bg-blue-50"
                  />
                </div>
                <div className="border-l border-slate-200">
                  <label htmlFor={doId} className="sr-only">
                    Do at {t}
                  </label>
                  <input
                    id={doId}
                    value={b.do ?? ''}
                    onChange={(e) => setCell(t, 'do', e.target.value)}
                    placeholder=""
                    className="h-full w-full bg-transparent px-3 py-2 text-sm text-slate-900 outline-none focus:bg-blue-50"
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-slate-300">
        <div className="border-b border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900">
          See
        </div>
        <div className="p-3">
          <Textarea
            value={see}
            onChange={(e) => onChangeSee(e.target.value)}
            placeholder=""
            className="min-h-[180px]"
          />
        </div>
      </div>
    </div>
  )
}

