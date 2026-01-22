import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button } from '../components/ui'
import { Calendar } from '../components/Calendar'
import { GoogleCalendarBulkSync } from '../components/GoogleCalendarBulkSync'
import { useEntries } from '../state/EntriesContext'
import { calculateStreaks, getYearRange } from '../lib/calendar'
import type { PdsEntry } from '../types/pds'

function getTagStats(entries: PdsEntry[]): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>()

  for (const entry of entries) {
    for (const tag of entry.tags) {
      counts.set(tag, (counts.get(tag) || 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
}

function getMonthlyStats(entries: PdsEntry[], year: number): Array<{ month: number; count: number }> {
  const stats = Array.from({ length: 12 }, (_, i) => ({ month: i, count: 0 }))

  for (const entry of entries) {
    const [entryYear, entryMonth] = entry.date.split('-').map(Number)
    if (entryYear === year) {
      stats[entryMonth - 1].count++
    }
  }

  return stats
}

function getCompletionStats(entries: PdsEntry[]): {
  withPlan: number
  withDo: number
  withSee: number
  withAllThree: number
} {
  let withPlan = 0
  let withDo = 0
  let withSee = 0
  let withAllThree = 0

  for (const entry of entries) {
    const hasPlan = entry.plan.trim().length > 0
    const hasDo = entry.do.trim().length > 0
    const hasSee = entry.see.trim().length > 0

    if (hasPlan) withPlan++
    if (hasDo) withDo++
    if (hasSee) withSee++
    if (hasPlan && hasDo && hasSee) withAllThree++
  }

  return { withPlan, withDo, withSee, withAllThree }
}

export default function YearPage() {
  const { entries, replaceAll } = useEntries()
  const today = new Date()
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())

  const yearRange = getYearRange(entries)
  const yearEntries = entries.filter((e) => e.date.startsWith(`${selectedYear}-`))
  const streaks = calculateStreaks(entries)
  const tagStats = getTagStats(yearEntries)
  const monthlyStats = getMonthlyStats(entries, selectedYear)
  const completionStats = getCompletionStats(yearEntries)

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

  const maxMonthCount = Math.max(...monthlyStats.map((s) => s.count), 1)

  return (
    <div className="min-h-full">
      <Header
        title="Year Overview"
        right={
          <Link to="/">
            <Button variant="secondary">Back to Timeline</Button>
          </Link>
        }
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid grid-cols-1 gap-4">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-600">Total Entries</div>
              <div className="mt-2 text-3xl font-bold text-slate-900">{yearEntries.length}</div>
              <div className="mt-1 text-xs text-slate-500">in {selectedYear}</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-600">Current Streak</div>
              <div className="mt-2 text-3xl font-bold text-blue-600">{streaks.currentStreak}</div>
              <div className="mt-1 text-xs text-slate-500">days in a row</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-600">Longest Streak</div>
              <div className="mt-2 text-3xl font-bold text-indigo-600">{streaks.longestStreak}</div>
              <div className="mt-1 text-xs text-slate-500">all-time best</div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs font-semibold text-slate-600">Completion Rate</div>
              <div className="mt-2 text-3xl font-bold text-emerald-600">
                {yearEntries.length ? Math.round((completionStats.withAllThree / yearEntries.length) * 100) : 0}%
              </div>
              <div className="mt-1 text-xs text-slate-500">Plan + Do + See filled</div>
            </div>
          </div>

          {/* Year Selector */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-xs font-semibold text-slate-700">Select Year:</div>
              {Array.from({ length: yearRange.end - yearRange.start + 1 }, (_, i) => yearRange.start + i).map(
                (year) => (
                  <Button
                    key={year}
                    variant={year === selectedYear ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setSelectedYear(year)}
                  >
                    {year}
                  </Button>
                ),
              )}
            </div>
          </div>

          <GoogleCalendarBulkSync entries={entries} onReplaceAll={replaceAll} year={selectedYear} />

          {/* Calendar */}
          <Calendar
            year={selectedYear}
            month={selectedMonth}
            entries={entries}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onToday={handleToday}
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Monthly Distribution */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Monthly Distribution</div>
              <div className="mt-1 text-xs text-slate-600">Entries per month in {selectedYear}</div>
              <div className="mt-4 space-y-2">
                {monthlyStats.map((stat) => {
                  const monthNames = [
                    'Jan',
                    'Feb',
                    'Mar',
                    'Apr',
                    'May',
                    'Jun',
                    'Jul',
                    'Aug',
                    'Sep',
                    'Oct',
                    'Nov',
                    'Dec',
                  ]
                  const barWidth = maxMonthCount > 0 ? (stat.count / maxMonthCount) * 100 : 0

                  return (
                    <div key={stat.month} className="flex items-center gap-3">
                      <div className="w-8 text-xs font-medium text-slate-600">{monthNames[stat.month]}</div>
                      <div className="flex-1">
                        <div className="h-6 w-full overflow-hidden rounded bg-slate-100">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-8 text-right text-xs font-semibold text-slate-700">{stat.count}</div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Top Tags */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-sm font-semibold text-slate-900">Top Tags</div>
              <div className="mt-1 text-xs text-slate-600">Most used tags in {selectedYear}</div>
              <div className="mt-4">
                {tagStats.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-500">No tags yet</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tagStats.slice(0, 20).map(({ tag, count }) => (
                      <div
                        key={tag}
                        className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 px-3 py-2 ring-1 ring-slate-200"
                      >
                        <span className="text-sm font-medium text-slate-900">{tag}</span>
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* PDS Completion Stats */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
              <div className="text-sm font-semibold text-slate-900">Plan / Do / See Completion</div>
              <div className="mt-1 text-xs text-slate-600">How often you fill each section</div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
                <div className="rounded-lg bg-blue-50 p-3 ring-1 ring-blue-200">
                  <div className="text-xs font-semibold text-blue-900">Plan</div>
                  <div className="mt-1 text-2xl font-bold text-blue-600">
                    {yearEntries.length ? Math.round((completionStats.withPlan / yearEntries.length) * 100) : 0}%
                  </div>
                  <div className="mt-0.5 text-xs text-blue-700">
                    {completionStats.withPlan} / {yearEntries.length} entries
                  </div>
                </div>

                <div className="rounded-lg bg-indigo-50 p-3 ring-1 ring-indigo-200">
                  <div className="text-xs font-semibold text-indigo-900">Do</div>
                  <div className="mt-1 text-2xl font-bold text-indigo-600">
                    {yearEntries.length ? Math.round((completionStats.withDo / yearEntries.length) * 100) : 0}%
                  </div>
                  <div className="mt-0.5 text-xs text-indigo-700">
                    {completionStats.withDo} / {yearEntries.length} entries
                  </div>
                </div>

                <div className="rounded-lg bg-purple-50 p-3 ring-1 ring-purple-200">
                  <div className="text-xs font-semibold text-purple-900">See</div>
                  <div className="mt-1 text-2xl font-bold text-purple-600">
                    {yearEntries.length ? Math.round((completionStats.withSee / yearEntries.length) * 100) : 0}%
                  </div>
                  <div className="mt-0.5 text-xs text-purple-700">
                    {completionStats.withSee} / {yearEntries.length} entries
                  </div>
                </div>

                <div className="rounded-lg bg-emerald-50 p-3 ring-1 ring-emerald-200">
                  <div className="text-xs font-semibold text-emerald-900">All Three</div>
                  <div className="mt-1 text-2xl font-bold text-emerald-600">
                    {yearEntries.length ? Math.round((completionStats.withAllThree / yearEntries.length) * 100) : 0}%
                  </div>
                  <div className="mt-0.5 text-xs text-emerald-700">
                    {completionStats.withAllThree} / {yearEntries.length} entries
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
