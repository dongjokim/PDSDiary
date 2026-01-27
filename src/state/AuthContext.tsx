import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export type AuthUser = {
  sub: string
  email?: string
  name?: string
  picture?: string
}

type AuthContextValue = {
  user: AuthUser | null
  setUser: (user: AuthUser | null) => void
  signOut: () => void
}

const STORAGE_KEY = 'pdsdiary:google:user'
const AuthContext = createContext<AuthContextValue | null>(null)

function loadUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthUser
    if (!parsed || typeof parsed.sub !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

function storeUser(user: AuthUser | null) {
  if (typeof window === 'undefined') return
  try {
    if (!user) {
      window.localStorage.removeItem(STORAGE_KEY)
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(() => loadUser())

  const setUser = useCallback((next: AuthUser | null) => {
    setUserState(next)
    storeUser(next)
  }, [])

  const signOutAll = useCallback(() => {
    setUser(null)
    if (supabase) supabase.auth.signOut()
  }, [setUser])

  const value = useMemo<AuthContextValue>(
    () => ({ user, setUser, signOut: signOutAll }),
    [user, setUser, signOutAll],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

