import type { PdsEntry, PdsExportV1 } from '../types/pds'

const STORAGE_KEY = 'pdsdiary:v1'

function storageKeyForUser(userId?: string | null): string {
  if (!userId) return STORAGE_KEY
  return `${STORAGE_KEY}:user:${userId}`
}

type StoredV1 = {
  version: 1
  entries: PdsEntry[]
}

function safeParseJSON(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function loadEntries(userId?: string | null): PdsEntry[] {
  if (typeof window === 'undefined') return []
  const key = storageKeyForUser(userId)
  const raw = window.localStorage.getItem(key)
  if (!raw) return []

  const parsed = safeParseJSON(raw) as StoredV1 | null
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.entries)) return []

  // Trust stored data structure (it's local), but ensure array shape.
  return parsed.entries.filter(Boolean)
}

export function saveEntries(entries: PdsEntry[], userId?: string | null): void {
  if (typeof window === 'undefined') return
  const payload: StoredV1 = { version: 1, entries }
  window.localStorage.setItem(storageKeyForUser(userId), JSON.stringify(payload))
}

export function migrateEntriesToUser(userId?: string | null): void {
  if (typeof window === 'undefined') return
  if (!userId) return
  const legacy = window.localStorage.getItem(STORAGE_KEY)
  if (!legacy) return
  const userKey = storageKeyForUser(userId)
  if (window.localStorage.getItem(userKey)) return
  window.localStorage.setItem(userKey, legacy)
}

export function makeExport(entries: PdsEntry[]): PdsExportV1 {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries,
  }
}

export function coerceImportedExport(raw: unknown): PdsExportV1 | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (obj.version !== 1) return null
  if (!Array.isArray(obj.entries)) return null

  const entries: PdsEntry[] = []
  for (const e of obj.entries) {
    const coerced = coerceEntry(e)
    if (coerced) entries.push(coerced)
  }

  return {
    version: 1,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
    entries,
  }
}

function coerceEntry(raw: unknown): PdsEntry | null {
  if (!raw || typeof raw !== 'object') return null
  const e = raw as Record<string, unknown>

  const id = typeof e.id === 'string' ? e.id : null
  const date = typeof e.date === 'string' ? e.date : null
  if (!id || !date) return null

  return {
    id,
    date,
    title: typeof e.title === 'string' ? e.title : '',
    tags: Array.isArray(e.tags) ? e.tags.filter((t): t is string => typeof t === 'string') : [],
    plan: typeof e.plan === 'string' ? e.plan : '',
    do: typeof e.do === 'string' ? e.do : '',
    doItems: Array.isArray(e.doItems)
      ? e.doItems.filter((item): item is string => typeof item === 'string').slice(0, 3)
      : undefined,
    doItemCategories: coerceDoItemCategories(e.doItemCategories),
    doItemColors: coerceDoItemColors(e.doItemColors),
    see: typeof e.see === 'string' ? e.see : '',
    bookMonth: coerceBookMonth(e.bookMonth),
    blocks: coerceBlocks(e.blocks),
    type: ['daily', 'weekly', 'monthly', 'yearly'].includes(e.type as string)
      ? (e.type as 'daily' | 'weekly' | 'monthly' | 'yearly')
      : undefined,
    createdAt: typeof e.createdAt === 'string' ? e.createdAt : new Date().toISOString(),
    updatedAt: typeof e.updatedAt === 'string' ? e.updatedAt : new Date().toISOString(),
  }
}

function coerceBookMonth(raw: unknown): PdsEntry['bookMonth'] | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const obj = raw as Record<string, unknown>
  const year = typeof obj.year === 'number' ? obj.year : null
  const month = typeof obj.month === 'number' ? obj.month : null
  if (year === null || month === null) return undefined

  const notes = typeof obj.notes === 'string' ? obj.notes : ''

  const weekdayGrid = Array.isArray(obj.weekdayGrid)
    ? obj.weekdayGrid.filter((x): x is string => typeof x === 'string').slice(0, 35)
    : []
  const paddedGrid = weekdayGrid.length === 35 ? weekdayGrid : [...weekdayGrid, ...Array(35 - weekdayGrid.length).fill('')]

  const habits = Array.isArray(obj.habits) ? obj.habits.filter((x): x is string => typeof x === 'string').slice(0, 5) : []
  const paddedHabits = habits.length === 5 ? habits : [...habits, ...Array(5 - habits.length).fill('')]

  const checksRaw = Array.isArray(obj.habitChecks) ? obj.habitChecks : []
  const habitChecks: boolean[][] = []
  for (let r = 0; r < 5; r += 1) {
    const row = Array.isArray(checksRaw[r]) ? (checksRaw[r] as unknown[]) : []
    const coercedRow = row.map((v) => v === true).slice(0, 31)
    while (coercedRow.length < 31) coercedRow.push(false)
    habitChecks.push(coercedRow)
  }

  return {
    year,
    month,
    notes,
    weekdayGrid: paddedGrid,
    habits: paddedHabits,
    habitChecks,
  }
}

const CATEGORY_VALUES = new Set(['project', 'exercise', 'family', 'meeting', ''] as const)
const COLOR_VALUES = new Set(['blue', 'green', 'purple', 'orange', 'pink', 'teal', ''] as const)

function coerceDoItemCategories(raw: unknown): PdsEntry['doItemCategories'] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: Array<'project' | 'exercise' | 'family' | 'meeting' | ''> = []
  for (const v of raw.slice(0, 3)) {
    if (typeof v === 'string' && CATEGORY_VALUES.has(v as any)) {
      out.push(v as any)
    } else {
      out.push('')
    }
  }
  return out.length ? out : undefined
}

function coerceDoItemColors(raw: unknown): PdsEntry['doItemColors'] | undefined {
  if (!Array.isArray(raw)) return undefined
  const out: Array<'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'teal' | ''> = []
  for (const v of raw.slice(0, 3)) {
    if (typeof v === 'string' && COLOR_VALUES.has(v as any)) {
      out.push(v as any)
    } else {
      out.push('')
    }
  }
  return out.length ? out : undefined
}

function coerceBlocks(raw: unknown): PdsEntry['blocks'] | undefined {
  if (!Array.isArray(raw)) return undefined
  const blocks: NonNullable<PdsEntry['blocks']> = []
  for (const b of raw) {
    if (!b || typeof b !== 'object') continue
    const obj = b as Record<string, unknown>
    const t = typeof obj.t === 'string' ? obj.t : null
    if (!t) continue
    const doTicks =
      typeof obj.doTicks === 'number' && !Number.isNaN(obj.doTicks) ? Math.max(0, Math.min(6, Math.round(obj.doTicks))) : undefined
    const category =
      typeof obj.category === 'string' && CATEGORY_VALUES.has(obj.category as any) ? (obj.category as any) : undefined
    const color =
      typeof obj.color === 'string' && COLOR_VALUES.has(obj.color as any) ? (obj.color as any) : undefined
    blocks.push({
      t,
      plan: typeof obj.plan === 'string' ? obj.plan : undefined,
      do: typeof obj.do === 'string' ? obj.do : undefined,
      doTicks,
      category,
      color,
    })
  }
  return blocks.length ? blocks : undefined
}

