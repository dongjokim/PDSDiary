import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Input } from '../components/ui'
import { loadGoogleIdentityScript } from '../lib/googleIdentity'
import { decodeGoogleIdToken } from '../lib/googleJwt'
import { useAuth } from '../state/AuthContext'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

const CLIENT_ID_KEY = 'pdsdiary:google:clientId'

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
  return /^\d+-[a-z0-9-]+\.apps\.googleusercontent\.com$/i.test(s)
}

export default function LoginPage() {
  const { setUser } = useAuth()
  const envClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? ''
  const [clientIdInput, setClientIdInput] = useState(() => loadClientId())
  const [status, setStatus] = useState<string | null>(null)
  const btnRef = useRef<HTMLDivElement | null>(null)

  const effectiveClientId = useMemo(() => (envClientId || clientIdInput).trim(), [envClientId, clientIdInput])

  useEffect(() => {
    storeClientId(clientIdInput)
  }, [clientIdInput])

  useEffect(() => {
    let canceled = false
    async function init() {
      if (!effectiveClientId) return
      if (!isLikelyGoogleClientId(effectiveClientId)) return
      await loadGoogleIdentityScript()
      if (!window.google?.accounts?.id || !btnRef.current || canceled) return
      btnRef.current.innerHTML = ''
      window.google.accounts.id.initialize({
        client_id: effectiveClientId,
        callback: (resp) => {
          const token = resp.credential
          if (!token) {
            setStatus('Google sign-in did not return a credential.')
            return
          }
          const payload = decodeGoogleIdToken(token)
          if (!payload) {
            setStatus('Could not decode Google ID token.')
            return
          }
          setUser({
            sub: payload.sub,
            email: payload.email,
            name: payload.name,
            picture: payload.picture,
          })
          if (isSupabaseConfigured() && supabase) {
            supabase.auth
              .signInWithIdToken({ provider: 'google', token })
              .then(({ error }) => {
                if (error) setStatus(`Supabase sync disabled: ${error.message}`)
              })
              .catch(() => setStatus('Supabase sync disabled: failed to sign in'))
          }
        },
      })
      window.google.accounts.id.renderButton(btnRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'rectangular',
        width: 280,
      })
    }
    void init()
    return () => {
      canceled = true
    }
  }, [effectiveClientId, setUser])

  return (
    <div className="min-h-full bg-slate-50">
      <div className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-10">
        <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-xl font-semibold text-slate-900">Sign in to PDS Diary</div>
          <div className="mt-1 text-sm text-slate-600">
            Use your Google account to access the diary and calendar sync.
          </div>
          {!isSupabaseConfigured() ? (
            <div className="mt-2 text-xs text-slate-500">
              Supabase sync is not configured. You can still use the app locally.
            </div>
          ) : null}

          {envClientId ? (
            <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
              Using <span className="font-semibold">VITE_GOOGLE_CLIENT_ID</span> from environment.
            </div>
          ) : (
            <label className="mt-4 block">
              <div className="text-xs font-semibold text-slate-700">Google OAuth Client ID</div>
              <div className="mt-1">
                <Input
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  placeholder="...apps.googleusercontent.com"
                />
              </div>
              <div className="mt-1 text-xs text-slate-500">
                Must be the <span className="font-semibold">Client ID</span> (not secret), ending with{' '}
                <span className="font-semibold">apps.googleusercontent.com</span>.
              </div>
            </label>
          )}

          <div className="mt-5">
            {!effectiveClientId ? (
              <div className="text-xs text-slate-600">Paste your Client ID to enable sign-in.</div>
            ) : !isLikelyGoogleClientId(effectiveClientId) ? (
              <div className="text-xs text-rose-600">Client ID format looks invalid.</div>
            ) : (
              <div ref={btnRef} />
            )}
          </div>

          {status ? (
            <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
              {status}
            </div>
          ) : null}

          {!envClientId ? (
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setClientIdInput('')
                  storeClientId('')
                }}
              >
                Clear
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

