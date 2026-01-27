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

export function coerceGoalsExport(raw: unknown): GoalsStorage | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Record<string, unknown>
  if (obj.version !== 1) return null
  if (!Array.isArray(obj.goals)) return null

  const goals: Goal[] = []
  for (const g of obj.goals) {
    const coerced = coerceGoal(g)
    if (coerced) goals.push(coerced)
  }
  return { version: 1, goals }
}

function coerceGoal(raw: unknown): Goal | null {
  if (!raw || typeof raw !== 'object') return null
  const g = raw as Record<string, unknown>
  if (typeof g.id !== 'string') return null
  if (typeof g.title !== 'string') return null
  const type = g.type
  if (type !== 'yearly' && type !== 'quarterly' && type !== 'monthly') return null

  const milestonesRaw = Array.isArray(g.milestones) ? g.milestones : []
  const milestones = milestonesRaw
    .filter((m) => m && typeof m === 'object' && typeof (m as any).id === 'string')
    .map((m) => ({
      id: (m as any).id as string,
      title: typeof (m as any).title === 'string' ? ((m as any).title as string) : '',
      completed: (m as any).completed === true,
      completedAt: typeof (m as any).completedAt === 'string' ? ((m as any).completedAt as string) : undefined,
    }))

  return {
    id: g.id as string,
    title: g.title as string,
    description: typeof g.description === 'string' ? (g.description as string) : '',
    type,
    status: g.status === 'completed' || g.status === 'archived' ? (g.status as any) : 'active',
    targetDate: typeof g.targetDate === 'string' ? (g.targetDate as string) : undefined,
    progress: typeof g.progress === 'number' ? (g.progress as number) : 0,
    tags: Array.isArray(g.tags) ? g.tags.filter((t): t is string => typeof t === 'string') : undefined,
    milestones,
    createdAt: typeof g.createdAt === 'string' ? (g.createdAt as string) : new Date().toISOString(),
    updatedAt: typeof g.updatedAt === 'string' ? (g.updatedAt as string) : new Date().toISOString(),
  }
}
