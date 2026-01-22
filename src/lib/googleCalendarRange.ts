import type { GoogleCalendarEvent } from './googleCalendar'
import { toLocalDateInputValue } from './time'

export async function fetchEventsInRange({
  accessToken,
  calendarId,
  timeMin,
  timeMax,
}: {
  accessToken: string
  calendarId: string
  /** ISO string */
  timeMin: string
  /** ISO string */
  timeMax: string
}): Promise<GoogleCalendarEvent[]> {
  const items: GoogleCalendarEvent[] = []
  let pageToken: string | undefined

  for (let guard = 0; guard < 20; guard += 1) {
    const url =
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
      `?singleEvents=true&orderBy=startTime&maxResults=2500` +
      `&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}` +
      (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : '')

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`Google Calendar API error (${res.status}): ${text || res.statusText}`)
    }

    const data = (await res.json()) as { items?: GoogleCalendarEvent[]; nextPageToken?: string }
    if (Array.isArray(data.items)) items.push(...data.items)
    if (!data.nextPageToken) break
    pageToken = data.nextPageToken
  }

  return items
}

function parseYmd(ymd: string): Date | null {
  const [y, m, d] = ymd.split('-').map((s) => Number(s))
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function addDays(d: Date, days: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + days)
  return copy
}

/**
 * Assign events to each local day they overlap.
 * Key: YYYY-MM-DD (local)
 */
export function groupEventsByLocalDay(events: GoogleCalendarEvent[]): Map<string, GoogleCalendarEvent[]> {
  const map = new Map<string, GoogleCalendarEvent[]>()

  const push = (day: string, e: GoogleCalendarEvent) => {
    const arr = map.get(day) ?? []
    arr.push(e)
    map.set(day, arr)
  }

  for (const e of events) {
    // All-day events
    if (e.start.date && e.end.date) {
      const start = parseYmd(e.start.date)
      const endExcl = parseYmd(e.end.date)
      if (!start || !endExcl) continue
      for (let cur = start; cur < endExcl; cur = addDays(cur, 1)) {
        push(toLocalDateInputValue(cur), e)
      }
      continue
    }

    const sRaw = e.start.dateTime
    const eRaw = e.end.dateTime
    if (!sRaw || !eRaw) continue

    const startMs = new Date(sRaw).getTime()
    const endMs = new Date(eRaw).getTime()
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) continue

    const startDay = new Date(startMs)
    startDay.setHours(0, 0, 0, 0)
    const endDay = new Date(endMs - 1)
    endDay.setHours(0, 0, 0, 0)

    for (let cur = startDay; cur <= endDay; cur = addDays(cur, 1)) {
      push(toLocalDateInputValue(cur), e)
    }
  }

  return map
}

