import { useEffect, useState } from 'react'
import { Button } from './ui'

function readStatus(): { status: string; error: string } {
  const el = document.querySelector('[data-supabase-sync-status]') as HTMLElement | null
  return {
    status: el?.getAttribute('data-supabase-sync-status') ?? 'Supabase sync: idle',
    error: el?.getAttribute('data-supabase-sync-error') ?? '',
  }
}

export function SupabaseSyncPanel() {
  const [status, setStatus] = useState('Supabase sync: idle')
  const [error, setError] = useState('')

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = readStatus()
      setStatus(next.status)
      setError(next.error)
    }, 1000)
    return () => window.clearInterval(id)
  }, [])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-slate-900">Supabase sync</div>
          <div className="mt-1 text-xs text-slate-600">{status}</div>
          {error ? <div className="mt-1 text-xs text-rose-600">{error}</div> : null}
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => window.dispatchEvent(new Event('pds-supabase-pull'))}
          >
            Force pull
          </Button>
          <Button onClick={() => window.dispatchEvent(new Event('pds-supabase-push'))}>
            Force push
          </Button>
        </div>
      </div>
    </div>
  )
}

