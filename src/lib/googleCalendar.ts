import { loadGoogleIdentityScript } from './googleIdentity'

export type GoogleAccessToken = {
  accessToken: string
  /** epoch ms */
  expiresAt: number
}

const TOKEN_KEY = 'pdsdiary:google:accessToken'

export function loadStoredToken(): GoogleAccessToken | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(TOKEN_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { accessToken?: unknown; expiresAt?: unknown }
    if (typeof parsed.accessToken !== 'string' || typeof parsed.expiresAt !== 'number') return null
    return { accessToken: parsed.accessToken, expiresAt: parsed.expiresAt }
  } catch {
    return null
  }
}

export function storeToken(token: GoogleAccessToken | null) {
  if (typeof window === 'undefined') return
  try {
    if (!token) {
      window.localStorage.removeItem(TOKEN_KEY)
      return
    }
    window.localStorage.setItem(TOKEN_KEY, JSON.stringify(token))
  } catch {
    // ignore
  }
}

export function isTokenValid(token: GoogleAccessToken | null): boolean {
  if (!token) return false
  // 30s buffer
  return Date.now() < token.expiresAt - 30_000
}

export async function requestAccessToken({
  clientId,
  scope,
  prompt = 'consent',
  uxMode = 'popup',
}: {
  clientId: string
  scope: string
  prompt?: '' | 'consent' | 'none'
  uxMode?: 'popup' | 'redirect'
}): Promise<GoogleAccessToken> {
  await loadGoogleIdentityScript()
  if (!window.google?.accounts?.oauth2?.initTokenClient) {
    throw new Error('Google Identity Services not available')
  }

  return await new Promise<GoogleAccessToken>((resolve, reject) => {
    const client = window.google!.accounts!.oauth2!.initTokenClient({
      client_id: clientId,
      scope,
      ux_mode: uxMode,
      callback: (resp) => {
        if (resp.error) {
          reject(new Error(resp.error))
          return
        }
        const token = resp.access_token
        const expiresIn = resp.expires_in ?? 3600
        if (!token) {
          reject(new Error('No access token returned'))
          return
        }
        resolve({ accessToken: token, expiresAt: Date.now() + expiresIn * 1000 })
      },
    })
    client.requestAccessToken({ prompt })
  })
}

export type GoogleCalendarEvent = {
  id: string
  summary: string
  start: { date?: string; dateTime?: string }
  end: { date?: string; dateTime?: string }
}

export type GoogleCalendarListItem = {
  id: string
  summary?: string
  primary?: boolean
  accessRole?: string
}

export async function fetchDayEvents({
  accessToken,
  calendarId,
  date,
}: {
  accessToken: string
  calendarId: string
  /** YYYY-MM-DD */
  date: string
}): Promise<GoogleCalendarEvent[]> {
  const [y, m, d] = date.split('-').map((s) => Number(s))
  if (!y || !m || !d) throw new Error('Invalid date')
  const startLocal = new Date(y, m - 1, d, 0, 0, 0)
  const endLocal = new Date(y, m - 1, d + 1, 0, 0, 0)
  const timeMin = startLocal.toISOString()
  const timeMax = endLocal.toISOString()

  const url =
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events` +
    `?singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}`

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Google Calendar API error (${res.status}): ${text || res.statusText}`)
  }

  const data = (await res.json()) as { items?: GoogleCalendarEvent[] }
  return Array.isArray(data.items) ? data.items : []
}

export async function fetchCalendarList({
  accessToken,
}: {
  accessToken: string
}): Promise<GoogleCalendarListItem[]> {
  const url = 'https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=250'
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Google Calendar API error (${res.status}): ${text || res.statusText}`)
  }
  const data = (await res.json()) as { items?: GoogleCalendarListItem[] }
  return Array.isArray(data.items) ? data.items : []
}

