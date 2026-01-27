/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { PdsEntry } from '../types/pds'
import { makeDefaultBlocks } from '../lib/blocks'
import { loadEntries, saveEntries, migrateEntriesToUser } from '../lib/storage'
import { toLocalDateInputValue } from '../lib/time'
import { useAuth } from './AuthContext'

type EntriesContextValue = {
  entries: PdsEntry[]
  hydrated: boolean
  getById: (id: string) => PdsEntry | undefined
  upsert: (entry: Omit<PdsEntry, 'updatedAt'> & Partial<Pick<PdsEntry, 'updatedAt'>>) => void
  remove: (id: string) => void
  replaceAll: (entries: PdsEntry[]) => void
  createDraft: () => PdsEntry
}

const EntriesContext = createContext<EntriesContextValue | null>(null)

function byUpdatedDesc(a: PdsEntry, b: PdsEntry): number {
  return b.updatedAt.localeCompare(a.updatedAt)
}

export function EntriesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.sub ?? null
  const [entries, setEntries] = useState<PdsEntry[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    if (!userId) {
      setEntries([])
      setHydrated(false)
      return
    }
    migrateEntriesToUser(userId)
    const loaded = loadEntries(userId)
    setEntries([...loaded].sort(byUpdatedDesc))
    setHydrated(true)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    saveEntries(entries, userId)
  }, [entries, userId])

  const getById = useCallback(
    (id: string) => {
      return entries.find((e) => e.id === id)
    },
    [entries],
  )

  const upsert = useCallback((entry: Omit<PdsEntry, 'updatedAt'> & Partial<Pick<PdsEntry, 'updatedAt'>>) => {
    setEntries((prev) => {
      const now = new Date().toISOString()
      const next: PdsEntry = {
        ...entry,
        updatedAt: entry.updatedAt ?? now,
      }

      const idx = prev.findIndex((e) => e.id === next.id)
      if (idx === -1) return [next, ...prev].sort(byUpdatedDesc)

      const copy = prev.slice()
      copy[idx] = next
      copy.sort(byUpdatedDesc)
      return copy
    })
  }, [])

  const remove = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const replaceAll = useCallback((nextEntries: PdsEntry[]) => {
    setEntries([...nextEntries].sort(byUpdatedDesc))
  }, [])

  const createDraft = useCallback((): PdsEntry => {
    const now = new Date().toISOString()
    return {
      id: crypto.randomUUID(),
      date: toLocalDateInputValue(new Date()),
      title: '',
      tags: [],
      plan: '',
      do: '',
      see: '',
      blocks: makeDefaultBlocks(),
      createdAt: now,
      updatedAt: now,
    }
  }, [])

  const value = useMemo<EntriesContextValue>(
    () => ({
      entries,
      hydrated,
      getById,
      upsert,
      remove,
      replaceAll,
      createDraft,
    }),
    [entries, hydrated, getById, upsert, remove, replaceAll, createDraft],
  )

  return <EntriesContext.Provider value={value}>{children}</EntriesContext.Provider>
}

export function useEntries(): EntriesContextValue {
  const ctx = useContext(EntriesContext)
  if (!ctx) throw new Error('useEntries must be used within EntriesProvider')
  return ctx
}

