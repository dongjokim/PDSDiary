import type { PdsEntry } from '../types/pds'
import type { GoogleCalendarEvent } from './googleCalendar'

type Block = NonNullable<PdsEntry['blocks']>[number]

function addText(existing: string | undefined, next: string): string {
  const cur = (existing ?? '').trim()
  if (!cur) return next
  if (cur.includes(next)) return cur
  return `${cur}; ${next}`
}

export function applyGoogleEventsToHourlyPlan({
  date,
  blocks,
  events,
}: {
  /** YYYY-MM-DD */
  date: string
  blocks: Block[]
  events: GoogleCalendarEvent[]
}): Block[] {
  const [y, m, d] = date.split('-').map((s) => Number(s))
  if (!y || !m || !d) return blocks

  const dayStart = new Date(y, m - 1, d, 0, 0, 0).getTime()
  const dayEnd = new Date(y, m - 1, d + 1, 0, 0, 0).getTime()

  const byHourSummaries = new Map<number, string[]>()

  for (const e of events) {
    const summary = (e.summary || '').trim()
    if (!summary) continue

    // All-day
    if (e.start.date && e.end.date) {
      byHourSummaries.set(0, [...(byHourSummaries.get(0) ?? []), `[All day] ${summary}`])
      continue
    }

    const sRaw = e.start.dateTime
    const eRaw = e.end.dateTime
    if (!sRaw || !eRaw) continue

    const s = new Date(sRaw).getTime()
    const end = new Date(eRaw).getTime()
    const clippedStart = Math.max(s, dayStart)
    const clippedEnd = Math.min(end, dayEnd)
    if (clippedEnd <= clippedStart) continue

    const startHour = new Date(clippedStart).getHours()
    const endHour = new Date(clippedEnd - 1).getHours()
    for (let h = startHour; h <= endHour; h += 1) {
      const arr = byHourSummaries.get(h) ?? []
      arr.push(summary)
      byHourSummaries.set(h, arr)
    }
  }

  if (byHourSummaries.size === 0) return blocks

  return blocks.map((b) => {
    // Merge into Plan (append + de-dupe), never overwrite.
    const existingPlan = (b.plan ?? '').trim()
    const [hh] = b.t.split(':')
    const hour = Number(hh)
    if (!Number.isFinite(hour)) return b
    const summaries = byHourSummaries.get(hour)
    if (!summaries || summaries.length === 0) return b
    const unique = Array.from(new Set(summaries))
    const merged = unique.reduce((acc, s) => addText(acc, s), existingPlan)
    return merged.trim() ? { ...b, plan: merged } : b
  })
}

