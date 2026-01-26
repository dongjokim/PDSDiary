import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input } from './ui'
import { clsx } from '../lib/clsx'
import { fetchCalendarList, fetchDayEvents, isTokenValid, loadStoredToken, requestAccessToken, storeToken } from '../lib/googleCalendar'
import type { GoogleCalendarEvent, GoogleCalendarListItem } from '../lib/googleCalendar'

const CAL_ID_KEY = 'pdsdiary:google:calendarId'
const APPLY_KEY = 'pdsdiary:google:applyToPlan'
const CLIENT_ID_KEY = 'pdsdiary:google:clientId'
const SCOPE = 'https://www.googleapis.com/auth/calendar.readonly'

function normalizeCalendarIds(raw: string): string[] {
  return raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean)
}

function loadCalendarId(): string {
  if (typeof window === 'undefined') return ''
  const raw = window.localStorage.getItem(CAL_ID_KEY) ?? ''
  if (!raw) return ''
  try {
    const parsed = JSON.parse(raw) as unknown
    if (Array.isArray(parsed)) return parsed.filter((v) => typeof v === 'string').join(', ')
  } catch {
    // fall through
  }
  return raw
}

function storeCalendarId(id: string) {
  if (typeof window === 'undefined') return
  const list = normalizeCalendarIds(id)
  window.localStorage.setItem(CAL_ID_KEY, JSON.stringify(list))
}

function loadClientId(): string {
  if (typeof window === 'undefined') return ''
  return window.localStorage.getItem(CLIENT_ID_KEY) ?? ''
}

function storeClientId(id: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CLIENT_ID_KEY, id)
}

function isLikelyGoogleClientId(v: string): boolean {
  const s = v.trim()
  // Typical format: 123456789012-abc123def456.apps.googleusercontent.com
  return /^\d+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i.test(s)
}

function loadApplyToPlan(): boolean {
  if (typeof window === 'undefined') return true
  const raw = window.localStorage.getItem(APPLY_KEY)
  if (raw === null) return true
  return raw === 'true'
}

function storeApplyToPlan(v: boolean) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(APPLY_KEY, String(v))
}

function formatTimeLabel(e: GoogleCalendarEvent): string {
  const s = e.start.dateTime ?? e.start.date
  const end = e.end.dateTime ?? e.end.date
  if (!s || !end) return ''
  // All-day events typically use date without time
  if (e.start.date && e.end.date) return 'All day'
  const sd = new Date(s)
  const ed = new Date(end)
  const opts: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' }
  return `${sd.toLocaleTimeString([], opts)}–${ed.toLocaleTimeString([], opts)}`
}

export function GoogleCalendarPanel({
  date,
  onApplyToPlan,
}: {
  date: string
  onApplyToPlan?: (events: GoogleCalendarEvent[]) => void
}) {
  const envClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''
  const [clientIdInput, setClientIdInput] = useState<string>(() => loadClientId())

  const [calendarId, setCalendarId] = useState<string>(() => loadCalendarId())
  const [token, setToken] = useState(() => loadStoredToken())
  const [events, setEvents] = useState<GoogleCalendarEvent[] | null>(null)
  const [calendars, setCalendars] = useState<GoogleCalendarListItem[] | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const inFlightRef = useRef(0)
  const [applyToPlan, setApplyToPlan] = useState<boolean>(() => loadApplyToPlan())

  const effectiveClientId = (envClientId || clientIdInput).trim()

  const tokenOk = useMemo(() => isTokenValid(token), [token])

  useEffect(() => {
    storeCalendarId(calendarId)
  }, [calendarId])

  useEffect(() => {
    storeClientId(clientIdInput)
  }, [clientIdInput])

  useEffect(() => {
    storeApplyToPlan(applyToPlan)
  }, [applyToPlan])

  const connect = async () => {
    if (!effectiveClientId) {
      setStatus('Missing Google OAuth Client ID. Paste it below (or set VITE_GOOGLE_CLIENT_ID).')
      return
    }
    if (!isLikelyGoogleClientId(effectiveClientId)) {
      setStatus(
        'That does not look like a Google OAuth Client ID. It should end with "apps.googleusercontent.com" (Client ID, not secret).',
      )
      return
    }
    setLoading(true)
    setStatus(null)
    try {
      const next = await requestAccessToken({
        clientId: effectiveClientId,
        scope: SCOPE,
        uxMode: 'popup',
      })
      setToken(next)
      storeToken(next)
      setStatus('Connected to Google.')
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to connect'
      setStatus(
        msg.includes('client was not found') || msg.includes('invalid_client')
          ? `${msg}\n\nTip: Create an OAuth Client ID of type "Web application" in Google Cloud Console and paste the Client ID (not secret).`
          : msg,
      )
    } finally {
      setLoading(false)
    }
  }

  const ensureToken = async (): Promise<string | null> => {
    if (tokenOk && token) return token.accessToken
    if (!effectiveClientId) return null
    try {
      // Try silent refresh first (works if user already granted consent + has an active session)
      const next = await requestAccessToken({
        clientId: effectiveClientId,
        scope: SCOPE,
        prompt: 'none',
        uxMode: 'popup',
      })
      setToken(next)
      storeToken(next)
      return next.accessToken
    } catch {
      return null
    }
  }

  const listCalendars = async () => {
    setLoading(true)
    setStatus(null)
    const reqId = ++inFlightRef.current
    try {
      const accessToken = await ensureToken()
      if (!accessToken) {
        setStatus('Please Connect to Google to list calendars.')
        setCalendars(null)
        return
      }
      const items = await fetchCalendarList({ accessToken })
      if (reqId !== inFlightRef.current) return
      setCalendars(items)
      const ids = normalizeCalendarIds(calendarId)
      const hasAny = ids.length ? ids.some((id) => items.some((c) => c.id === id)) : false
      setStatus(
        items.length
          ? `Loaded ${items.length} calendars.${ids.length ? (hasAny ? ' Calendar ID is accessible.' : ' Calendar ID not found in your list.') : ''}`
          : 'No calendars returned.',
      )
    } catch (e) {
      if (reqId !== inFlightRef.current) return
      setStatus(e instanceof Error ? e.message : 'Failed to list calendars')
    } finally {
      if (reqId !== inFlightRef.current) return
      setLoading(false)
    }
  }

  const disconnect = () => {
    setToken(null)
    storeToken(null)
    setEvents(null)
    setCalendars(null)
    setStatus('Disconnected.')
  }

  const loadEvents = async () => {
    const ids = normalizeCalendarIds(calendarId)
    if (!ids.length) {
      setStatus('Please enter at least one Calendar ID.')
      return
    }
    setLoading(true)
    setStatus(null)
    const reqId = ++inFlightRef.current
    try {
      const accessToken = await ensureToken()
      if (!accessToken) {
        setStatus('Please Connect to Google to load events.')
        setEvents(null)
        return
      }
      const all: GoogleCalendarEvent[] = []
      for (const id of ids) {
        const items = await fetchDayEvents({ accessToken, calendarId: id, date })
        all.push(...items)
      }
      const deduped = Array.from(new Map(all.map((e) => [e.id, e])).values())
      if (reqId !== inFlightRef.current) return
      setEvents(deduped)
      if (applyToPlan && onApplyToPlan) onApplyToPlan(deduped)
      setStatus(deduped.length ? `Loaded ${deduped.length} events.` : 'No events for this day.')
    } catch (e) {
      if (reqId !== inFlightRef.current) return
      setStatus(e instanceof Error ? e.message : 'Failed to load events')
    } finally {
      if (reqId !== inFlightRef.current) return
      setLoading(false)
    }
  }

  // Auto-sync: whenever date/calendar changes and we're connected, load events.
  useEffect(() => {
    if (!calendarId.trim()) return
    if (!tokenOk) return
    void loadEvents()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, calendarId, tokenOk])

  // Auto-refresh every 5 minutes while connected.
  useEffect(() => {
    if (!calendarId.trim()) return
    if (!tokenOk) return
    const id = window.setInterval(() => void loadEvents(), 5 * 60 * 1000)
    return () => window.clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendarId, tokenOk, date])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-slate-900">Google Calendar (read-only)</div>
          <div className="mt-1 text-xs text-slate-600">
            Connect, then load events for <span className="font-semibold tabular-nums">{date}</span>.
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!tokenOk ? (
            <Button variant="secondary" onClick={connect} disabled={loading}>
              Connect
            </Button>
          ) : (
            <>
              <Button variant="secondary" onClick={disconnect} disabled={loading}>
                Disconnect
              </Button>
              <Button variant="secondary" onClick={listCalendars} disabled={loading}>
                List calendars
              </Button>
              <Button onClick={loadEvents} disabled={loading}>
                Refresh
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        {envClientId ? (
          <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
            Using <span className="font-semibold">VITE_GOOGLE_CLIENT_ID</span> from environment.
          </div>
        ) : (
          <label className="block">
            <div className="text-xs font-semibold text-slate-700">Google OAuth Client ID</div>
            <div className="mt-1">
              <div className="flex gap-2">
                <Input
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="...apps.googleusercontent.com"
                />
                <Button
                  variant="secondary"
                  onClick={() => {
                    setClientIdInput('')
                    storeClientId('')
                  }}
                  disabled={loading}
                >
                  Clear
                </Button>
              </div>
            </div>
            <div className="mt-1 text-xs text-slate-500">
              Must be the <span className="font-semibold">Client ID</span> (not secret), ending with{' '}
              <span className="font-semibold">apps.googleusercontent.com</span>.
            </div>
          </label>
        )}

        <label className="block">
          <div className="text-xs font-semibold text-slate-700">Calendar IDs (comma-separated)</div>
          <div className="mt-1">
            <Input
              value={calendarId}
              onChange={(e) => setCalendarId(e.target.value)}
              placeholder="primary@... , family@... , other@..."
            />
          </div>
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-700">
          <input
            type="checkbox"
            checked={applyToPlan}
            onChange={(e) => setApplyToPlan(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-slate-900"
          />
          Apply events to hourly Plan
        </label>
      </div>

      <div className="mt-2 text-xs text-slate-500">
        OAuth origin: <span className="font-semibold">{typeof window !== 'undefined' ? window.location.origin : ''}</span>
      </div>

      {status ? (
        <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
          {status}
        </div>
      ) : null}

      {events ? (
        <div className="mt-3 space-y-2">
          {events.length === 0 ? (
            <div className="text-xs text-slate-500">No events.</div>
          ) : (
            events.map((e) => (
              <div
                key={e.id}
                className={clsx('flex items-start justify-between gap-3 rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200')}
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900">{e.summary || '(No title)'}</div>
                  <div className="mt-0.5 text-xs text-slate-600">{formatTimeLabel(e)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {calendars ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-slate-700">Accessible calendars</div>
            <div className="text-xs text-slate-500">{calendars.length}</div>
          </div>
          <div className="mt-2 max-h-56 overflow-auto space-y-1">
            {calendars.map((c) => {
              const selected = c.id === calendarId.trim()
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setCalendarId(c.id)}
                  className={clsx(
                    'w-full rounded-lg px-2 py-1 text-left text-xs ring-1 ring-slate-200 hover:bg-slate-50',
                    selected ? 'bg-slate-900 text-white hover:bg-slate-900' : 'bg-white text-slate-800',
                  )}
                  title={c.id}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 truncate">
                      {c.summary ?? '(No name)'}
                      {c.primary ? <span className="ml-2 text-[10px] opacity-80">(primary)</span> : null}
                    </div>
                    <div className={clsx('shrink-0 text-[10px] opacity-80')}>{c.accessRole ?? ''}</div>
                  </div>
                  <div className={clsx('mt-0.5 truncate text-[10px] opacity-80')}>{c.id}</div>
                </button>
              )
            })}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            If your family calendar ID doesn’t appear here, your Google account doesn’t have access to it (sharing/permissions).
          </div>
        </div>
      ) : null}
    </div>
  )
}

