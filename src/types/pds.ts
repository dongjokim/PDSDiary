export type PdsEntry = {
  id: string
  /** YYYY-MM-DD in the user's local timezone */
  date: string
  title: string
  tags: string[]
  plan: string
  do: string
  /** 3 action items for the Do section */
  doItems?: string[]
  /** Optional category per Do item (same length as doItems) */
  doItemCategories?: Array<'project' | 'exercise' | 'family' | 'meeting' | ''>
  /** Optional project color per Do item (only when category = project) */
  doItemColors?: Array<'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'teal' | ''>
  see: string
  /**
   * Book-aligned monthly spread:
   * - Notes panel (left)
   * - Weekday grid (7 columns × 5 rows)
   * - Habits list + 1–31 checkbox grid (5 habits × 31 days)
   */
  bookMonth?: {
    /** 4-digit year */
    year: number
    /** 0-based month (0=Jan) */
    month: number
    notes: string
    /** 35 cells in row-major order: row0 col0..col6, row1..., row4... */
    weekdayGrid: string[]
    /** 5 habit labels */
    habits: string[]
    /** 5 rows × 31 days */
    habitChecks: boolean[][]
  }
  /**
   * 24h time blocks in hourly increments.
   * Plan = intended time use, Do = actual time use.
   */
  blocks?: Array<{
    /** "HH:MM" 24-hour local time */
    t: string
    plan?: string
    /** Optional 0–6 ticks (10 minutes each) for the hour */
    doTicks?: number
    /** Optional comment for what you actually did */
    do?: string
    /** Optional category for the hour */
    category?: 'project' | 'exercise' | 'family' | 'meeting' | ''
    /** Optional project color for the hour (only when category = project) */
    color?: 'blue' | 'green' | 'purple' | 'orange' | 'pink' | 'teal' | ''
  }>
  /** Entry type: daily, weekly, monthly, yearly */
  type?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  createdAt: string
  updatedAt: string
}

export type PdsExportV1 = {
  version: 1
  exportedAt: string
  entries: PdsEntry[]
}

