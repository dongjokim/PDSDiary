import { Link } from 'react-router-dom'
import { clsx } from '../lib/clsx'
import { getMonthCalendar, getDayName, getMonthName } from '../lib/calendar'
import type { PdsEntry } from '../types/pds'
import { toLocalDateInputValue } from '../lib/time'
import { Button } from './ui'
import { categoryColorClass } from '../lib/categoryColors'

export function Calendar({
  year,
  month,
  entries,
  onPrevMonth,
  onNextMonth,
  onToday,
}: {
  year: number
  month: number
  entries: PdsEntry[]
  onPrevMonth: () => void
  onNextMonth: () => void
  onToday: () => void
}) {
  const weeks = getMonthCalendar(year, month, entries)
  const today = toLocalDateInputValue(new Date())

  const colorsForEntry = (entry?: PdsEntry): string[] => {
    if (!entry) return []
    const colors = new Set<string>()
    if (entry.blocks) {
      for (const b of entry.blocks) {
        if (b.category) colors.add(categoryColorClass(b.category, b.projectTag))
      }
    }
    if (entry.doItemCategories) {
      entry.doItemCategories.forEach((cat, idx) => {
        if (!cat) return
        const tag = entry.doItemProjectTags?.[idx] ?? ''
        colors.add(categoryColorClass(cat, tag))
      })
    }
    return Array.from(colors).slice(0, 3)
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">
            {getMonthName(month)} {year}
          </div>
          <div className="mt-0.5 text-xs text-slate-600">
            {entries.filter((e) => e.date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)).length}{' '}
            entries this month
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onToday} size="sm">
            Today
          </Button>
          <Button variant="secondary" onClick={onPrevMonth} size="sm">
            ←
          </Button>
          <Button variant="secondary" onClick={onNextMonth} size="sm">
            →
          </Button>
        </div>
      </div>

      <div className="p-4">
        {/* Weekday headers */}
        <div className="mb-2 grid grid-cols-7 gap-1">
          {[0, 1, 2, 3, 4, 5, 6].map((day) => (
            <div key={day} className="text-center text-xs font-semibold text-slate-600">
              {getDayName(day)}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="space-y-1">
          {weeks.map((week, weekIdx) => (
            <div key={weekIdx} className="grid grid-cols-7 gap-1">
              {week.map((day) => {
                const isToday = day.date === today

                if (!day.hasEntry) {
                  return (
                    <Link
                      key={day.date}
                      to={`/new?date=${day.date}`}
                      className={clsx(
                        'flex h-14 flex-col items-center justify-center rounded-lg border transition',
                        day.isCurrentMonth
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
                      'group flex h-14 flex-col items-center justify-center rounded-lg border transition',
                      day.isCurrentMonth
                        ? 'border-slate-300 bg-gradient-to-br from-blue-50 to-indigo-50 hover:border-slate-400 hover:from-blue-100 hover:to-indigo-100'
                        : 'border-slate-200 bg-slate-100 text-slate-500',
                      isToday && 'ring-2 ring-blue-500 ring-offset-1',
                    )}
                  >
                    <div className={clsx('text-sm font-semibold', day.isCurrentMonth ? 'text-slate-900' : '')}>
                      {day.dayOfMonth}
                    </div>
                    {day.entry ? (
                      <div className="mt-1 flex items-center gap-1">
                        {colorsForEntry(day.entry).map((c, idx) => (
                          <span key={idx} className={clsx('h-1.5 w-3 rounded-full', c)} />
                        ))}
                      </div>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
