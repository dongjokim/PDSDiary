import { Textarea, Input, Badge } from './ui'
import type { PdsEntry } from '../types/pds'
import type { PdsEntry as Entry } from '../types/pds'
import { getMonthCalendar, getDayName, getMonthName } from '../lib/calendar'
import { clsx } from '../lib/clsx'
import { Link } from 'react-router-dom'
import { toLocalDateInputValue } from '../lib/time'
import type { Goal } from '../types/goals'

type BookMonth = NonNullable<PdsEntry['bookMonth']>

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function BookMonthLayout({
  value,
  onChange,
  entries,
  monthlyGoals = [],
}: {
  value: BookMonth
  onChange: (next: BookMonth) => void
  entries: Entry[]
  monthlyGoals?: Goal[]
}) {
  const habits = value.habits.length === 5 ? value.habits : [...value.habits, ...Array(5).fill('')].slice(0, 5)
  const checks = value.habitChecks.length === 5 ? value.habitChecks : Array.from({ length: 5 }, () => Array(31).fill(false))

  const setHabitLabel = (row: number, text: string) => {
    const next = habits.slice()
    next[row] = text
    onChange({ ...value, habits: next })
  }

  const toggleCheck = (row: number, dayIdx: number) => {
    const next = checks.map((r) => r.slice())
    next[row][dayIdx] = !next[row][dayIdx]
    onChange({ ...value, habitChecks: next })
  }

  const weeks = getMonthCalendar(value.year, value.month, entries)
  const today = toLocalDateInputValue(new Date())

  return (
    <div className="grid grid-cols-1 gap-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Notes panel (left) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Month notes</div>
          <div className="mt-2 text-xs text-slate-600">Quick scratchpad (matches the book’s left panel).</div>
          <div className="mt-3">
            <Textarea
              value={value.notes}
              onChange={(e) => onChange({ ...value, notes: e.target.value })}
              placeholder=""
              className="min-h-[360px]"
            />
          </div>
        </div>

        {/* Calendar (right) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {getMonthName(value.month)} {value.year}
              </div>
              <div className="mt-0.5 text-xs text-slate-600">
                Tap a day to create/open that day’s entry.
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="mb-2 grid grid-cols-7 gap-1">
              {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-slate-600">
                  {getDayName(day)}
                </div>
              ))}
            </div>

            <div className="space-y-1">
              {weeks.map((week, weekIdx) => (
                <div key={weekIdx} className="grid grid-cols-7 gap-1">
                  {week.map((day) => {
                    const isToday = day.date === today
                    const mm = pad2(value.month + 1)
                    const inThisMonth = day.date.startsWith(`${value.year}-${mm}`)

                    if (!day.hasEntry) {
                      return (
                        <Link
                          key={day.date}
                          to={`/new?date=${day.date}`}
                          className={clsx(
                            'flex h-16 flex-col items-center justify-center rounded-lg border transition',
                            inThisMonth
                              ? 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                              : 'border-slate-100 bg-slate-50 text-slate-400',
                            isToday && 'ring-2 ring-blue-500 ring-offset-1',
                          )}
                        >
                          <div className="text-sm font-medium">{day.dayOfMonth}</div>
                        </Link>
                      )
                    }

                    return (
                      <Link
                        key={day.date}
                        to={`/entry/${day.entry?.id}`}
                        className={clsx(
                          'group flex h-16 flex-col items-center justify-center rounded-lg border transition',
                          inThisMonth
                            ? 'border-slate-300 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-slate-400 hover:from-blue-100 hover:to-indigo-100'
                            : 'border-slate-200 bg-slate-100 text-slate-500',
                          isToday && 'ring-2 ring-blue-500 ring-offset-1',
                        )}
                      >
                        <div className={clsx('text-sm font-semibold', inThisMonth ? 'text-slate-900' : '')}>
                          {day.dayOfMonth}
                        </div>
                        {day.entry && <div className="mt-0.5 h-1 w-6 rounded-full bg-blue-500 group-hover:bg-blue-600" />}
                      </Link>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {monthlyGoals.length ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Monthly goals</div>
          <div className="mt-3 grid grid-cols-1 gap-2">
            {monthlyGoals.map((g) => (
              <div key={g.id} className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{g.title}</div>
                    {g.description ? (
                      <div className="mt-1 text-xs text-slate-600">{g.description}</div>
                    ) : null}
                  </div>
                  <Badge>{g.status}</Badge>
                </div>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <div>Progress</div>
                    <div className="tabular-nums">{Math.round(g.progress)}%</div>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                    <div className="h-full bg-slate-900" style={{ width: `${Math.min(100, Math.max(0, g.progress))}%` }} />
                  </div>
                </div>
                {g.targetDate ? (
                  <div className="mt-2 text-xs text-slate-500">Target: {g.targetDate}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Habits tracker */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm font-semibold text-slate-900">Habits</div>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-[280px_1fr]">
          <div className="space-y-3">
            {habits.map((h, idx) => (
              <label key={idx} className="block">
                <div className="text-xs font-semibold text-slate-700">Habit {idx + 1}</div>
                <div className="mt-1">
                  <Input value={h} onChange={(e) => setHabitLabel(idx, e.target.value)} placeholder="" />
                </div>
              </label>
            ))}
          </div>

          <div className="overflow-auto">
            <div className="min-w-[900px] overflow-hidden rounded-xl border border-slate-300">
              <div
                className="grid border-b border-slate-300 bg-slate-50 text-[11px] font-semibold text-slate-800"
                style={{ gridTemplateColumns: 'repeat(31, minmax(24px, 1fr))' }}
              >
                {Array.from({ length: 31 }, (_, i) => (
                  <div key={i} className="border-r border-slate-300 px-1 py-2 text-center last:border-r-0">
                    {i + 1}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1">
                {checks.map((row, rIdx) => (
                  <div
                    key={rIdx}
                    className="grid border-b border-slate-200 last:border-b-0"
                    style={{ gridTemplateColumns: 'repeat(31, minmax(24px, 1fr))' }}
                  >
                    {row.slice(0, 31).map((checked, dIdx) => (
                      <button
                        key={dIdx}
                        type="button"
                        onClick={() => toggleCheck(rIdx, dIdx)}
                        className="flex h-8 items-center justify-center border-r border-slate-200 last:border-r-0"
                        aria-pressed={checked}
                        title={`Habit ${rIdx + 1}, day ${dIdx + 1}`}
                      >
                        <span
                          className={
                            checked
                              ? 'h-4 w-4 rounded bg-slate-900'
                              : 'h-4 w-4 rounded border border-slate-400 bg-white'
                          }
                        />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-2 text-xs text-slate-500">Scroll horizontally if needed (31 days).</div>
          </div>
        </div>
      </div>
    </div>
  )
}

