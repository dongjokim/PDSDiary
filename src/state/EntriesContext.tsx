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

type DoCategory = NonNullable<PdsEntry['doItemCategories']>[number]

function normalizeProjectTags(entry: PdsEntry): PdsEntry {
  let changed = false

  const hadCategories = Boolean(entry.doItemCategories?.length)
  let doItemCategories: DoCategory[] = entry.doItemCategories ? entry.doItemCategories.slice(0, 3) : (['', '', ''] as DoCategory[])
  const doItemProjectTags = entry.doItemProjectTags ? entry.doItemProjectTags.slice(0, 3) : undefined

  if (doItemProjectTags) {
    doItemProjectTags.forEach((tag, idx) => {
      if (tag && !doItemCategories[idx]) {
        doItemCategories[idx] = 'project'
        changed = true
      }
    })
  }

  const blocks = entry.blocks
    ? entry.blocks.map((b) => {
        if (b.projectTag && !b.category) {
          changed = true
          return { ...b, category: 'project' as NonNullable<PdsEntry['blocks']>[number]['category'] }
        }
        return b
      })
    : undefined

  if (!changed) return entry
  return {
    ...entry,
    doItemCategories: changed || hadCategories ? doItemCategories : undefined,
    blocks,
  }
}

function normalizeEntries(entries: PdsEntry[]): PdsEntry[] {
  return entries.map(normalizeProjectTags)
}

function applyDefaultSleepPlan(blocks: NonNullable<PdsEntry['blocks']>): NonNullable<PdsEntry['blocks']> {
  return blocks.map((b) => {
    if (b.plan) return b
    const hour = Number(b.t.split(':')[0])
    if (!Number.isNaN(hour) && hour >= 0 && hour < 8) {
      return { ...b, plan: 'Sleep' }
    }
    return b
  })
}

export function EntriesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.supabaseUserId ?? user?.sub ?? null
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
    setEntries(normalizeEntries([...loaded]).sort(byUpdatedDesc))
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
    setEntries(normalizeEntries([...nextEntries]).sort(byUpdatedDesc))
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
      blocks: applyDefaultSleepPlan(makeDefaultBlocks()),
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

