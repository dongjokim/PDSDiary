import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Goal } from '../types/goals'
import { loadGoals, saveGoals, migrateGoalsToUser } from '../lib/goalsStorage'
import { useAuth } from './AuthContext'

type GoalsContextValue = {
  goals: Goal[]
  addGoal: (goal: Goal) => void
  updateGoal: (id: string, updates: Partial<Goal>) => void
  deleteGoal: (id: string) => void
  getById: (id: string) => Goal | undefined
}

const GoalsContext = createContext<GoalsContextValue | null>(null)

export function GoalsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.sub ?? null
  const [goals, setGoals] = useState<Goal[]>([])

  useEffect(() => {
    if (!userId) {
      setGoals([])
      return
    }
    migrateGoalsToUser(userId)
    setGoals(loadGoals(userId))
  }, [userId])

  const persist = useCallback((newGoals: Goal[]) => {
    setGoals(newGoals)
    if (userId) saveGoals(newGoals, userId)
  }, [userId])

  const addGoal = useCallback(
    (goal: Goal) => {
      persist([...goals, goal])
    },
    [goals, persist],
  )

  const updateGoal = useCallback(
    (id: string, updates: Partial<Goal>) => {
      const updated = goals.map((g) => (g.id === id ? { ...g, ...updates, updatedAt: new Date().toISOString() } : g))
      persist(updated)
    },
    [goals, persist],
  )

  const deleteGoal = useCallback(
    (id: string) => {
      persist(goals.filter((g) => g.id !== id))
    },
    [goals, persist],
  )

  const getById = useCallback((id: string) => goals.find((g) => g.id === id), [goals])

  return (
    <GoalsContext.Provider value={{ goals, addGoal, updateGoal, deleteGoal, getById }}>
      {children}
    </GoalsContext.Provider>
  )
}

export function useGoals() {
  const ctx = useContext(GoalsContext)
  if (!ctx) throw new Error('useGoals must be used within GoalsProvider')
  return ctx
}
