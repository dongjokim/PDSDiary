import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'

function clsx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
}) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed'

  const variants: Record<NonNullable<typeof variant>, string> = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100',
  }

  const sizes: Record<NonNullable<typeof size>, string> = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 text-sm',
  }

  return (
    <button
      className={clsx(base, variants[variant], sizes[size], className)}
      {...props}
    />
  )
}

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={clsx(
        'h-10 w-full rounded-lg bg-white px-3 text-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400',
        className,
      )}
      {...props}
    />
  )
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        'min-h-28 w-full resize-y rounded-lg bg-white px-3 py-2 text-sm ring-1 ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-sky-400',
        className,
      )}
      {...props}
    />
  )
}

export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200">
      {children}
    </span>
  )
}

