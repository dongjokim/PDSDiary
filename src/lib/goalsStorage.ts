import type { Goal, GoalsStorage } from '../types/goals'

const STORAGE_KEY = 'pdsdiary:goals:v1'

function storageKeyForUser(userId?: string | null): string {
  if (!userId) return STORAGE_KEY
  return `${STORAGE_KEY}:user:${userId}`
}

function safeParseJSON(raw: string): unknown {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function loadGoals(userId?: string | null): Goal[] {
  if (typeof window === 'undefined') return []
  const raw = window.localStorage.getItem(storageKeyForUser(userId))
  if (!raw) return []

  const parsed = safeParseJSON(raw) as GoalsStorage | null
  if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.goals)) return []

  return parsed.goals.filter(Boolean)
}

export function saveGoals(goals: Goal[], userId?: string | null): void {
  if (typeof window === 'undefined') return
  const payload: GoalsStorage = { version: 1, goals }
  window.localStorage.setItem(storageKeyForUser(userId), JSON.stringify(payload))
}

export function migrateGoalsToUser(userId?: string | null): void {
  if (typeof window === 'undefined') return
  if (!userId) return
  const legacy = window.localStorage.getItem(STORAGE_KEY)
  if (!legacy) return
  const userKey = storageKeyForUser(userId)
  if (window.localStorage.getItem(userKey)) return
  window.localStorage.setItem(userKey, legacy)
}
