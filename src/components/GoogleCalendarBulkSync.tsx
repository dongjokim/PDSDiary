import { useMemo, useState } from 'react'
import { Button, Input } from './ui'
import { applyGoogleEventsToHourlyPlan } from '../lib/applyCalendarToPlan'
import { makeDefaultBlocks } from '../lib/blocks'
import type { PdsEntry } from '../types/pds'
import { fetchEventsInRange, groupEventsByLocalDay } from '../lib/googleCalendarRange'
import { isTokenValid, loadStoredToken, requestAccessToken, storeToken } from '../lib/googleCalendar'

const CAL_ID_KEY = 'pdsdiary:google:calendarId'
const CLIENT_ID_KEY = 'pdsdiary:google:clientId'
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

function loadStr(key: string): string {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(key) ?? ''
}

function ymd(year: number, month1: number, day: number): string {
  const mm = String(month1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${year}-${mm}-${dd}`
}

function toIsoStartOfDayLocal(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map((s) => Number(s))
  return new Date(y, m - 1, d, 0, 0, 0).toISOString()
}

function toIsoEndExclusiveLocal(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split('-').map((s) => Number(s))
  return new Date(y, m - 1, d + 1, 0, 0, 0).toISOString()
}

function findEntryIndexForDate(entries: PdsEntry[], date: string): number {
  // Prefer a daily entry (type undefined treated as daily).
  const idxDaily = entries.findIndex((e) => e.date === date && (e.type ?? 'daily') === 'daily')
  if (idxDaily !== -1) return idxDaily
  return entries.findIndex((e) => e.date === date)
}

function createEmptyEntryForDate(date: string): PdsEntry {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    date,
    title: '',
    tags: [],
    plan: '',
    do: '',
    see: '',
    doItems: ['', '', ''],
    blocks: makeDefaultBlocks(),
    type: 'daily',
    createdAt: now,
    updatedAt: now,
  }
}

export function GoogleCalendarBulkSync({
  entries,
  onReplaceAll,
  year,
}: {
  entries: PdsEntry[]
  onReplaceAll: (next: PdsEntry[]) => void
  year: number
}) {
  const [token, setToken] = useState(() => loadStoredToken())
  const tokenOk = useMemo(() => isTokenValid(token), [token])

  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? loadStr(CLIENT_ID_KEY)
  const calendarId = loadStr(CAL_ID_KEY)

  const [start, setStart] = useState(() => ymd(year, 1, 1))
  const [end, setEnd] = useState(() => ymd(year, 12, 31))
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const connect = async () => {
    if (!clientId.trim()) {
      setStatus('Missing Google OAuth Client ID (set it in the Entry page Google panel first).')
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const next = await requestAccessToken({ clientId: clientId.trim(), scope: SCOPE, uxMode: 'popup' })
      setToken(next)
      storeToken(next)
      setStatus('Connected to Google.')
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Failed to connect')
    } finally {
      setLoading(false)
    }
  }

  const ensureAccessToken = async (): Promise<string | null> => {
    if (tokenOk && token) return token.accessToken
    if (!clientId.trim()) return null
    try {
      const next = await requestAccessToken({ clientId: clientId.trim(), scope: SCOPE, prompt: 'none', uxMode: 'popup' })
      setToken(next)
      storeToken(next)
      return next.accessToken
    } catch {
      return null
    }
  }

  const runSync = async () => {
    if (!calendarId.trim()) {
      setStatus('Missing Calendar ID (set it in the Entry page Google panel first).')
      return
    }
    const accessToken = await ensureAccessToken()
    if (!accessToken) {
      setStatus('Please Connect first.')
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const timeMin = toIsoStartOfDayLocal(start)
      const timeMax = toIsoEndExclusiveLocal(end)
      const events = await fetchEventsInRange({ accessToken, calendarId: calendarId.trim(), timeMin, timeMax })
      const byDay = groupEventsByLocalDay(events)

      const nextEntries = entries.slice()
      let touchedDays = 0
      let created = 0
      const now = new Date().toISOString()

      for (const [day, dayEvents] of byDay.entries()) {
        // Only touch days inside range (defensive)
        if (day < start || day > end) continue
        let idx = findEntryIndexForDate(nextEntries, day)
        if (idx === -1) {
          nextEntries.push(createEmptyEntryForDate(day))
          idx = nextEntries.length - 1
          created += 1
        }
        const e = nextEntries[idx]
        const updatedBlocks = applyGoogleEventsToHourlyPlan({
          date: day,
          blocks: e.blocks ?? makeDefaultBlocks(),
          events: dayEvents,
        })
        nextEntries[idx] = { ...e, blocks: updatedBlocks, updatedAt: now }
        touchedDays += 1
      }

      onReplaceAll(nextEntries)
      setStatus(`Synced ${touchedDays} days from Google Calendar. Created ${created} new entries.`)
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Sync failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">Google Calendar → Plan (bulk sync)</div>
          <div className="mt-1 text-xs text-slate-600">
            Applies meetings into each day’s hourly <span className="font-semibold">Plan</span> (merge, de-dupe).
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={connect} disabled={loading}>
            {tokenOk ? 'Re-connect' : 'Connect'}
          </Button>
          <Button onClick={runSync} disabled={loading || !tokenOk}>
            Sync range
          </Button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <div className="text-xs font-semibold text-slate-700">Start</div>
          <div className="mt-1">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </div>
        </label>
        <label className="block">
          <div className="text-xs font-semibold text-slate-700">End</div>
          <div className="mt-1">
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </div>
        </label>
      </div>

      <div className="mt-2 text-xs text-slate-500">
        Using Calendar ID: <span className="font-semibold">{calendarId.trim() ? calendarId : '(not set)'}</span>
      </div>

      {status ? (
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
          {status}
        </div>
      ) : null}
    </div>
  )
}

