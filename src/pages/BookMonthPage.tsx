import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button } from '../components/ui'
import { BookMonthLayout } from '../components/BookMonthLayout'
import type { PdsEntry } from '../types/pds'
import { useEntries } from '../state/EntriesContext'
import { toLocalDateInputValue } from '../lib/time'
import { useGoals } from '../state/GoalsContext'

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

function makeDraftForMonth(year: number, month: number): PdsEntry {
  const now = new Date().toISOString()
  const date = `${year}-${pad2(month + 1)}-01`
  return {
    id: monthKey(year, month),
    date,
    title: `Book Month: ${year}-${pad2(month + 1)}`,
    tags: [],
    plan: '',
    do: '',
    see: '',
    type: 'monthly',
    bookMonth: makeEmptyBookMonth(year, month),
    createdAt: now,
    updatedAt: now,
  }
}

export default function BookMonthPage({ year, month }: { year: number; month: number }) {
  const nav = useNavigate()
  const { entries, upsert, remove } = useEntries()
  const { goals } = useGoals()

  const today = new Date()

  const existing = useMemo(() => {
    const id = monthKey(year, month)
    return entries.find((e) => e.id === id)
  }, [entries, month, year])

  const [draft, setDraft] = useState<PdsEntry>(() => {
    if (existing && existing.bookMonth) {
      return existing
    }
    return makeDraftForMonth(year, month)
  })

  const [status, setStatus] = useState<string | null>(null)

  const onSave = () => {
    const nowIso = new Date().toISOString()
    upsert({
      ...draft,
      createdAt: existing ? draft.createdAt : nowIso,
      updatedAt: nowIso,
    })
    setStatus('Saved.')
  }

  const onDelete = () => {
    if (!confirm('Delete this month spread? This cannot be undone.')) return
    remove(draft.id)
    nav('/')
  }

  const jumpThisMonth = () => {
    const y = today.getFullYear()
    const m = today.getMonth()
    nav(`/book/month?year=${y}&month=${m}`)
  }

  const displayStamp = `${year}-${pad2(month + 1)}`
  const dateToday = toLocalDateInputValue(today)

  const monthlyGoals = goals.filter((g) => {
    if (g.type !== 'monthly') return false
    if (!g.targetDate) return false
    const [gy, gm] = g.targetDate.split('-').map(Number)
    return gy === year && gm === month + 1
  })

  const yearlyGoals = goals.filter((g) => {
    if (g.type !== 'yearly') return false
    if (!g.targetDate) return false
    const [gy] = g.targetDate.split('-').map(Number)
    return gy === year
  })

  return (
    <div className="min-h-full">
      <Header
        title={`Book Month • ${displayStamp}`}
        right={
          <>
            <Link to="/">
              <Button variant="secondary">Back</Button>
            </Link>
            <Button variant="secondary" onClick={jumpThisMonth}>
              This month ({dateToday.slice(0, 7)})
            </Button>
            {existing ? (
              <Button variant="danger" onClick={onDelete}>
                Delete
              </Button>
            ) : null}
            <Button onClick={onSave}>Save</Button>
          </>
        }
      />

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {status ? (
          <div className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
            {status}
          </div>
        ) : null}

        {draft.bookMonth ? (
          <BookMonthLayout
            value={draft.bookMonth}
            entries={entries}
            monthlyGoals={monthlyGoals}
            yearlyGoals={yearlyGoals}
            onChange={(next) => {
              setDraft((d) => ({
                ...d,
                date: `${next.year}-${pad2(next.month + 1)}-01`,
                title: `Book Month: ${next.year}-${pad2(next.month + 1)}`,
                type: 'monthly',
                bookMonth: next,
              }))
              setStatus(null)
            }}
          />
        ) : null}
      </main>
    </div>
  )
}

