import type { PdsEntry } from '../types/pds'

export type CalendarDay = {
  date: string // YYYY-MM-DD
  dayOfMonth: number
  isCurrentMonth: boolean
  hasEntry: boolean
  entry?: PdsEntry
}

export type CalendarWeek = CalendarDay[]

export function getMonthCalendar(year: number, month: number, entries: PdsEntry[]): CalendarWeek[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDate = new Date(firstDay)

  // Start from Sunday of the first week
  startDate.setDate(startDate.getDate() - startDate.getDay())

  const weeks: CalendarWeek[] = []
  const current = new Date(startDate)

  // Build entry map for quick lookup
  const entryMap = new Map<string, PdsEntry>()
  const weight = (e: PdsEntry): number => {
    // Prefer showing daily entries on the calendar when multiple entries share the same date
    // (e.g. Book Month entries use YYYY-MM-01).
    const t = e.type ?? 'daily'
    if (t === 'daily') return 4
    if (t === 'weekly') return 3
    if (t === 'monthly') return 2
    if (t === 'yearly') return 1
    return 0
  }
  for (const entry of entries) {
    const prev = entryMap.get(entry.date)
    if (!prev) {
      entryMap.set(entry.date, entry)
      continue
    }
    if (weight(entry) > weight(prev)) entryMap.set(entry.date, entry)
  }

  while (current <= lastDay || current.getDay() !== 0) {
    const week: CalendarWeek = []

    for (let i = 0; i < 7; i++) {
      const dateStr = toDateString(current)
      const dayOfMonth = current.getDate()
      const isCurrentMonth = current.getMonth() === month
      const entry = entryMap.get(dateStr)

      week.push({
        date: dateStr,
        dayOfMonth,
        isCurrentMonth,
        hasEntry: !!entry,
        entry,
      })

      current.setDate(current.getDate() + 1)
    }

    weeks.push(week)

    // Stop after we've passed the last day and completed the week
    if (current > lastDay && current.getDay() === 0) break
  }

  return weeks
}

export function toDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function getMonthName(month: number): string {
  const names = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return names[month]
}

export function getDayName(day: number): string {
  const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return names[day]
}

export function getYearRange(entries: PdsEntry[]): { start: number; end: number } {
  if (entries.length === 0) {
    const current = new Date().getFullYear()
    return { start: current, end: current }
  }

  let minYear = Infinity
  let maxYear = -Infinity

  for (const entry of entries) {
    const year = parseInt(entry.date.split('-')[0], 10)
    if (year < minYear) minYear = year
    if (year > maxYear) maxYear = year
  }

  return { start: minYear, end: maxYear }
}

export function calculateStreaks(entries: PdsEntry[]): {
  currentStreak: number
  longestStreak: number
  totalDays: number
} {
  if (entries.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalDays: 0 }
  }

  // Sort entries by date
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 1

  const today = toDateString(new Date())
  const yesterday = toDateString(new Date(Date.now() - 86400000))

  // Calculate streaks
  for (let i = 1; i < sorted.length; i++) {
    const prevDate = parseDate(sorted[i - 1].date)
    const currDate = parseDate(sorted[i].date)

    const dayDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / 86400000)

    if (dayDiff === 1) {
      tempStreak++
    } else {
      longestStreak = Math.max(longestStreak, tempStreak)
      tempStreak = 1
    }
  }

  longestStreak = Math.max(longestStreak, tempStreak)

  // Calculate current streak
  const lastEntry = sorted[sorted.length - 1]
  if (lastEntry.date === today || lastEntry.date === yesterday) {
    currentStreak = 1
    for (let i = sorted.length - 2; i >= 0; i--) {
      const prevDate = parseDate(sorted[i].date)
      const currDate = parseDate(sorted[i + 1].date)
      const dayDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / 86400000)

      if (dayDiff === 1) {
        currentStreak++
      } else {
        break
      }
    }
  }

  return {
    currentStreak,
    longestStreak,
    totalDays: entries.length,
  }
}
