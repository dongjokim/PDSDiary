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
  const [status, setStatus] = useState<string>('Supabase sync: idle')

  const userId = user?.sub ?? null

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase || !userId) return

    let cancelled = false

    async function pull() {
      const client = supabase
      if (!client) return
      setStatus('Supabase sync: pulling...')
      const { data, error } = await client
        .from('pds_data')
        .select('user_id, entries, goals, updated_at')
        .eq('user_id', userId)
        .maybeSingle<SyncRow>()

      if (cancelled) return
      if (error) {
        // ignore for now
        setStatus('Supabase sync: pull failed')
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
          // ignore
          setStatus('Supabase sync: merge failed')
        }
      }
      if (!data) setStatus('Supabase sync: no remote data')
      pulledRef.current = true
    }

    void pull()

    return () => {
      cancelled = true
    }
  }, [entries, goals, replaceEntries, replaceGoals, userId])

  useEffect(() => {
    if (!pulledRef.current) return
    if (!entriesHydrated || !goalsHydrated) return
    readyRef.current = true
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
    if (!isSupabaseConfigured() || !supabase || !userId) return
    if (!readyRef.current) return
    if (!entriesHydrated || !goalsHydrated) return

    // Initial push after local data is loaded
    if (!initialPushRef.current) {
      const client = supabase
      if (client) {
        setStatus('Supabase sync: uploading...')
        client.from('pds_data').upsert(payload, { onConflict: 'user_id' })
          .then(({ error }) => {
            if (error) setStatus('Supabase sync: upload failed')
            else setStatus('Supabase sync: up to date')
          })
      }
      initialPushRef.current = true
      return
    }

    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      const client = supabase
      if (!client) return
      setStatus('Supabase sync: uploading...')
      client.from('pds_data').upsert(payload, { onConflict: 'user_id' })
        .then(({ error }) => {
          if (error) setStatus('Supabase sync: upload failed')
          else setStatus('Supabase sync: up to date')
        })
    }, 1200)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [payload, userId, entriesHydrated, goalsHydrated])

  return (
    <>
      <div className="hidden" data-supabase-sync-status={status} />
      {children}
    </>
  )
}

