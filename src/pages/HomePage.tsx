import { useRef, useState } from 'react'
import type { ChangeEventHandler } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { Badge, Button, Input } from '../components/ui'
import { Calendar } from '../components/Calendar'
import type { PdsEntry } from '../types/pds'
import { coerceImportedExport, makeExport } from '../lib/storage'
import { generateYearEndReport } from '../lib/reports'
import { useEntries } from '../state/EntriesContext'
import { useGoals } from '../state/GoalsContext'
import { SupabaseSyncPanel } from '../components/SupabaseSyncPanel'
import { makeDefaultBlocks } from '../lib/blocks'
import { toLocalDateInputValue } from '../lib/time'

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function applySleepPlanToBlocks(blocks: NonNullable<PdsEntry['blocks']>): NonNullable<PdsEntry['blocks']> {
  return blocks.map((b) => {
    if (b.plan) return b
    const hour = Number(b.t.split(':')[0])
    if (!Number.isNaN(hour) && hour >= 0 && hour < 8) {
      return { ...b, plan: 'Sleep' }
    }
    return b
  })
}

function toDateString(date: Date): string {
  return toLocalDateInputValue(date)
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function monthKey(year: number, month: number): string {
  return `book-month:${year}-${pad2(month + 1)}`
}

function makeEmptyBookMonth(year: number, month: number): NonNullable<PdsEntry['bookMonth']> {
  return {
    year,
    month,
    notes: '',
    weekdayGrid: Array(35).fill(''),
    habits: Array(5).fill(''),
    habitChecks: Array.from({ length: 5 }, () => Array(31).fill(false)),
  }
}
export default function HomePage() {
  const { entries, replaceAll, upsert } = useEntries()
  const { goals } = useGoals()
  const [notice, setNotice] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const today = new Date()
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())

  const monthlyGoals = goals.filter((g) => {
    if (g.type !== 'monthly') return false
    if (!g.targetDate) return false
    const [gy, gm] = g.targetDate.split('-').map(Number)
    return gy === selectedYear && gm === selectedMonth + 1
  })

  const yearlyGoals = goals.filter((g) => {
    if (g.type !== 'yearly') return false
    if (!g.targetDate) return false
    const [gy] = g.targetDate.split('-').map(Number)
    return gy === selectedYear
  })

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear((y) => y - 1)
    } else {
      setSelectedMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear((y) => y + 1)
    } else {
      setSelectedMonth((m) => m + 1)
    }
  }

  const handleToday = () => {
    setSelectedYear(today.getFullYear())
    setSelectedMonth(today.getMonth())
  }

  const onExport = () => {
    const payload = makeExport(entries)
    const stamp = new Date().toISOString().slice(0, 10)
    downloadJson(`pds-diary-${stamp}.json`, payload)
    setNotice('Exported JSON file.')
  }

  const onExportYearReport = () => {
    const currentYear = new Date().getFullYear()
    const report = generateYearEndReport(entries, currentYear)
    downloadText(`pds-diary-${currentYear}-report.md`, report)
    setNotice(`Exported ${currentYear} year-end report.`)
  }

  const onPickImport = () => {
    setNotice(null)
    fileRef.current?.click()
  }

  const onImportFile: ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      const imported = coerceImportedExport(parsed)
      if (!imported) {
        setNotice('Import failed: unsupported file format.')
        return
      }

      // Merge by id; prefer newer updatedAt
      const map = new Map<string, PdsEntry>()
      for (const existing of entries) map.set(existing.id, existing)
      for (const incoming of imported.entries) {
        const prev = map.get(incoming.id)
        if (!prev || incoming.updatedAt.localeCompare(prev.updatedAt) > 0) map.set(incoming.id, incoming)
      }

      const merged = Array.from(map.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      replaceAll(merged)
      setNotice(`Imported ${imported.entries.length} entries (merged into ${merged.length} total).`)
    } catch {
      setNotice('Import failed: could not read JSON.')
    }
  }

  const onFillSleepThroughYearEnd = () => {
    const today = new Date()
    const start = new Date(today)
    start.setDate(start.getDate() + 1)
    start.setHours(0, 0, 0, 0)
    const end = new Date(today.getFullYear(), 11, 31)
    end.setHours(0, 0, 0, 0)
    if (start > end) {
      setNotice('No future dates left in this year.')
      return
    }
    if (!confirm(`Fill Sleep (00:00–08:00) plans from ${toDateString(start)} to ${toDateString(end)}?`)) {
      return
    }

    const byDate = new Map(entries.map((e) => [e.date, e]))
    let created = 0
    let updated = 0
    const now = new Date().toISOString()

    const cursor = new Date(start)
    while (cursor <= end) {
      const date = toDateString(cursor)
      const existing = byDate.get(date)
      if (existing) {
        const nextBlocks = applySleepPlanToBlocks(existing.blocks ?? makeDefaultBlocks())
        upsert({
          ...existing,
          blocks: nextBlocks,
          updatedAt: now,
        })
        updated += 1
      } else {
        const blocks = applySleepPlanToBlocks(makeDefaultBlocks())
        upsert({
          id: crypto.randomUUID(),
          date,
          title: '',
          tags: [],
          plan: '',
          do: '',
          see: '',
          blocks,
          createdAt: now,
          updatedAt: now,
        })
        created += 1
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    setNotice(`Filled Sleep plans through year end. Created ${created}, updated ${updated}.`)
  }

  const monthEntryId = monthKey(selectedYear, selectedMonth)
  const existingMonthEntry = entries.find((e) => e.id === monthEntryId)
  const bookMonthValue = existingMonthEntry?.bookMonth ?? makeEmptyBookMonth(selectedYear, selectedMonth)

  const updateBookMonth = (next: NonNullable<PdsEntry['bookMonth']>) => {
    const now = new Date().toISOString()
    upsert({
      id: monthEntryId,
      date: `${next.year}-${pad2(next.month + 1)}-01`,
      title: `Book Month: ${next.year}-${pad2(next.month + 1)}`,
      tags: [],
      plan: '',
      do: '',
      see: '',
      type: 'monthly',
      bookMonth: next,
      createdAt: existingMonthEntry ? existingMonthEntry.createdAt : now,
      updatedAt: now,
    })
  }

  return (
    <div className="min-h-full">
      <Header
        right={
          <>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={onImportFile}
            />
            <Link to="/year">
              <Button variant="secondary">Year Overview</Button>
            </Link>
            <Link to="/week">
              <Button variant="secondary">Week View</Button>
            </Link>
            <Link to={`/book/month?year=${selectedYear}&month=${selectedMonth}`}>
              <Button variant="secondary">Book Month</Button>
            </Link>
            <Link to="/goals">
              <Button variant="secondary">Goals</Button>
            </Link>
            <Button variant="secondary" onClick={onPickImport}>
              Import
            </Button>
            <Button variant="secondary" onClick={onExport} disabled={entries.length === 0}>
              Export JSON
            </Button>
            <Button variant="secondary" onClick={onExportYearReport} disabled={entries.length === 0}>
              Year Report
            </Button>
            <Link to="/new">
              <Button>New entry</Button>
            </Link>
          </>
        }
      />

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-4">
          {/* Monthly Calendar */}
          <Calendar
            year={selectedYear}
            month={selectedMonth}
            entries={entries}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onToday={handleToday}
          />

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-slate-900">Habit tracker</div>
                <div className="mt-1 text-xs text-slate-600">
                  Track habits for {selectedYear}-{pad2(selectedMonth + 1)}.
                </div>
              </div>
              <Button variant="secondary" onClick={onFillSleepThroughYearEnd}>
                Fill Sleep (00–08) to year end
              </Button>
            </div>

            <div className="mt-4 overflow-x-auto">
              <div className="min-w-[960px]">
                <div className="grid grid-cols-[160px_repeat(31,minmax(0,1fr))] items-center gap-1 text-xs text-slate-500">
                  <div />
                  {Array.from({ length: 31 }, (_, i) => (
                    <div key={i} className="text-center">
                      {i + 1}
                    </div>
                  ))}
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2">
                  {bookMonthValue.habits.map((label, rowIdx) => (
                    <div key={rowIdx} className="grid grid-cols-[160px_repeat(31,minmax(0,1fr))] items-center gap-1">
                      <Input
                        value={label}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const next = bookMonthValue.habits.slice()
                          next[rowIdx] = e.target.value
                          updateBookMonth({ ...bookMonthValue, habits: next })
                        }}
                        placeholder={`Habit ${rowIdx + 1}`}
                      />
                      {Array.from({ length: 31 }, (_, dayIdx) => {
                        const checked = bookMonthValue.habitChecks[rowIdx]?.[dayIdx] ?? false
                        return (
                          <button
                            type="button"
                            key={dayIdx}
                            onClick={() => {
                              const checks = bookMonthValue.habitChecks.map((r) => r.slice())
                              checks[rowIdx][dayIdx] = !checked
                              updateBookMonth({ ...bookMonthValue, habitChecks: checks })
                            }}
                            className="flex h-6 w-full items-center justify-center rounded border border-slate-200 bg-white text-[10px] text-slate-600 hover:bg-slate-50"
                            aria-pressed={checked}
                          >
                            {checked ? '✓' : ''}
                          </button>
                        )
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {(monthlyGoals.length || yearlyGoals.length) ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Goals for this month</div>
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

              {yearlyGoals.length ? (
                <>
                  <div className="mt-4 text-sm font-semibold text-slate-900">Yearly goals</div>
                  <div className="mt-3 grid grid-cols-1 gap-2">
                    {yearlyGoals.map((g) => (
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
                </>
              ) : null}
            </div>
          ) : null}

          {notice ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
                {notice}
              </div>
            </div>
          ) : null}

          <SupabaseSyncPanel />
        </div>
      </main>
    </div>
  )
}

