export type Goal = {
  id: string
  title: string
  description: string
  type: 'yearly' | 'quarterly' | 'monthly'
  status: 'active' | 'completed' | 'archived'
  targetDate?: string // YYYY-MM-DD
  progress: number // 0-100
  milestones: Array<{
    id: string
    title: string
    completed: boolean
    completedAt?: string
  }>
  createdAt: string
  updatedAt: string
}

export type GoalsStorage = {
  version: 1
  goals: Goal[]
}
