import { useEffect, useMemo, useRef } from 'react'
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
  const { entries, replaceAll: replaceEntries } = useEntries()
  const { goals, replaceAll: replaceGoals } = useGoals()

  const readyRef = useRef(false)
  const debounceRef = useRef<number | null>(null)

  const userId = user?.sub ?? null

  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase || !userId) return

    let cancelled = false

    async function pull() {
      const client = supabase
      if (!client) return
      const { data, error } = await client
        .from('pds_data')
        .select('user_id, entries, goals, updated_at')
        .eq('user_id', userId)
        .maybeSingle<SyncRow>()

      if (cancelled) return
      if (error) {
        // ignore for now
        readyRef.current = true
        return
      }
      if (data) {
        try {
          const remoteEntries = (data.entries as any[]) ?? []
          const remoteGoals = (data.goals as any[]) ?? []
          replaceEntries(mergeByUpdatedAt(entries as any, remoteEntries as any))
          replaceGoals(mergeByUpdatedAt(goals as any, remoteGoals as any))
        } catch {
          // ignore
        }
      }
      readyRef.current = true
    }

    void pull()

    return () => {
      cancelled = true
    }
  }, [entries, goals, replaceEntries, replaceGoals, userId])

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
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      const client = supabase
      if (!client) return
      client.from('pds_data').upsert(payload, { onConflict: 'user_id' })
    }, 1200)
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current)
    }
  }, [payload, userId])

  return <>{children}</>
}

