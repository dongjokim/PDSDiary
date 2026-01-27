import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useEntries } from './EntriesContext'
import { useGoals } from './GoalsContext'

type SyncRow = {
  user_id: string
  entries: unknown
  goals: unknown
  updated_at: string
}

function mergeByUpdatedAt<T extends { id: string; updatedAt: string }>(local: T[], remote: T[]): T[] {
  const map = new Map<string, T>()
  for (const e of local) map.set(e.id, e)
  for (const e of remote) {
    const prev = map.get(e.id)
    if (!prev || e.updatedAt.localeCompare(prev.updatedAt) > 0) map.set(e.id, e)
  }
  return Array.from(map.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export function SupabaseSyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { entries, replaceAll: replaceEntries, hydrated: entriesHydrated } = useEntries()
  const { goals, replaceAll: replaceGoals, hydrated: goalsHydrated } = useGoals()

  const readyRef = useRef(false)
  const pulledRef = useRef(false)
  const initialPushRef = useRef(false)
  const debounceRef = useRef<number | null>(null)
  const pullTimeoutRef = useRef<number | null>(null)
  const [status, setStatus] = useState<string>('Supabase sync: idle')
  const [lastError, setLastError] = useState<string | null>(null)
  const [pullTick, setPullTick] = useState(0)
  const [ready, setReady] = useState(false)

  const userId = user?.supabaseUserId ?? null

  const pushNow = (label: string) => {
    const client = supabase
    if (!client) return
    setLastError(null)
    setStatus(`Supabase sync: ${label}`)
    client.from('pds_data').upsert(payload, { onConflict: 'user_id' })
      .then(({ error }) => {
        if (error) {
          setLastError(error.message)
          setStatus(`Supabase sync: upload failed (${error.message})`)
        } else {
          setStatus('Supabase sync: up to date')
        }
      })
  }

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return
    if (!userId) {
      setStatus('Supabase sync: idle (not signed into Supabase)')
      return
    }
    if (pulledRef.current) return

    let cancelled = false

    async function pull() {
      const client = supabase
      if (!client) return
      setLastError(null)
      setStatus('Supabase sync: pulling...')
      if (pullTimeoutRef.current) window.clearTimeout(pullTimeoutRef.current)
      pullTimeoutRef.current = window.setTimeout(() => {
        setStatus('Supabase sync: pulling… (slow connection)')
      }, 8000)
      const { data, error } = await client
        .from('pds_data')
        .select('user_id, entries, goals, updated_at')
        .eq('user_id', userId)
        .maybeSingle<SyncRow>()

      if (cancelled) return
      if (pullTimeoutRef.current) {
        window.clearTimeout(pullTimeoutRef.current)
        pullTimeoutRef.current = null
      }
      if (error) {
        setLastError(error.message)
        setStatus(`Supabase sync: pull failed (${error.message})`)
        pulledRef.current = true
        return
      }
      if (data) {
        try {
          const remoteEntries = (data.entries as any[]) ?? []
          const remoteGoals = (data.goals as any[]) ?? []
          replaceEntries(mergeByUpdatedAt(entries as any, remoteEntries as any))
          replaceGoals(mergeByUpdatedAt(goals as any, remoteGoals as any))
          setStatus('Supabase sync: merged')
        } catch {
          setStatus('Supabase sync: merge failed')
        }
      }
      if (!data) {
        setStatus('Supabase sync: no remote data')
        if (entriesHydrated && goalsHydrated) {
          pushNow('uploading...')
        }
      }
      pulledRef.current = true
    }

    void pull()

    return () => {
      cancelled = true
      if (pullTimeoutRef.current) {
        window.clearTimeout(pullTimeoutRef.current)
        pullTimeoutRef.current = null
      }
    }
  }, [replaceEntries, replaceGoals, userId, entriesHydrated, goalsHydrated, pullTick])

  useEffect(() => {
    const onPull = () => {
      pulledRef.current = false
      initialPushRef.current = false
      if (!userId) {
        setStatus('Supabase sync: idle (not signed into Supabase)')
        return
      }
      setStatus('Supabase sync: pulling...')
      setPullTick((t) => t + 1)
    }
    const onPush = () => {
      if (!userId) {
        setStatus('Supabase sync: idle (not signed into Supabase)')
        return
      }
      pushNow('uploading...')
    }
    window.addEventListener('pds-supabase-pull', onPull)
    window.addEventListener('pds-supabase-push', onPush)
    return () => {
      window.removeEventListener('pds-supabase-pull', onPull)
      window.removeEventListener('pds-supabase-push', onPush)
    }
  }, [pushNow, userId])

  useEffect(() => {
    if (!pulledRef.current) return
    if (!entriesHydrated || !goalsHydrated) return
    readyRef.current = true
    setReady(true)
  }, [entriesHydrated, goalsHydrated])

  const payload = useMemo(
    () => ({
      user_id: userId,
      entries,
      goals,
      updated_at: new Date().toISOString(),
    }),
    [userId, entries, goals],
  )

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return
    if (!userId) return
    if (!readyRef.current || !ready) return
    if (!entriesHydrated || !goalsHydrated) return

    // Initial push after local data is loaded
    if (!initialPushRef.current) {
      pushNow('uploading...')
      initialPushRef.current = true
      return
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      pushNow('uploading...')
    }, 1200)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [payload, userId, entriesHydrated, goalsHydrated, ready])

  return (
    <>
      <div
        className="hidden"
        data-supabase-sync-status={status}
        data-supabase-sync-error={lastError ?? ''}
      />
      {children}
    </>
  )
}

