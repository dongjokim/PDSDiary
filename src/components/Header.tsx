import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Button } from './ui'
import { useAuth } from '../state/AuthContext'

export function Header({
  title,
  right,
}: {
  title?: string
  right?: ReactNode
}) {
  const { user, signOut } = useAuth()

  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold text-slate-900 hover:bg-slate-100"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
              P
            </span>
            <span className="truncate">PDS Diary</span>
          </Link>
          {title ? (
            <div className="mt-1 truncate text-xs text-slate-600">{title}</div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <div className="hidden items-center gap-2 text-xs text-slate-600 sm:flex">
              {user.picture ? (
                <img src={user.picture} alt="" className="h-6 w-6 rounded-full" />
              ) : null}
              <span className="max-w-[180px] truncate">{user.email ?? user.name ?? 'Signed in'}</span>
            </div>
          ) : null}
          {right}
          {user ? (
            <Button variant="secondary" size="sm" onClick={signOut}>
              Sign out
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  )
}

