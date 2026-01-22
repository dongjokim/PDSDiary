import { useCallback, useRef, useState } from 'react'
import { clsx } from '../lib/clsx'

function clampInt(n: number, min: number, max: number): number {
  if (Number.isNaN(n)) return min
  return Math.max(min, Math.min(max, Math.round(n)))
}

function valueFromPointer(e: React.PointerEvent<HTMLDivElement>, segments: number): number {
  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX - rect.left
  const pct = rect.width > 0 ? x / rect.width : 0
  // Map to [0..segments]
  return clampInt(pct * segments, 0, segments)
}

export function TickBar({
  value,
  onChange,
  segments = 6,
  label = 'Minutes bar',
}: {
  value: number
  onChange: (next: number) => void
  segments?: number
  label?: string
}) {
  const [dragging, setDragging] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  const setFromPointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      onChange(valueFromPointer(e, segments))
    },
    [onChange, segments],
  )

  return (
    <div className="flex items-center gap-2">
      <div
        ref={rootRef}
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={segments}
        aria-valuenow={Math.max(0, Math.min(segments, value))}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault()
            onChange(Math.max(0, value - 1))
          } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault()
            onChange(Math.min(segments, value + 1))
          } else if (e.key === 'Home') {
            e.preventDefault()
            onChange(0)
          } else if (e.key === 'End') {
            e.preventDefault()
            onChange(segments)
          }
        }}
        onPointerDown={(e) => {
          ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
          setDragging(true)
          setFromPointer(e)
        }}
        onPointerMove={(e) => {
          if (!dragging) return
          setFromPointer(e)
        }}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        className={clsx(
          'grid h-7 w-32 grid-cols-6 gap-1 rounded-lg border border-slate-300 bg-white p-1 outline-none',
          'focus:ring-2 focus:ring-blue-500 focus:ring-offset-1',
          dragging ? 'cursor-ew-resize' : 'cursor-pointer',
        )}
        style={{ gridTemplateColumns: `repeat(${segments}, minmax(0, 1fr))` }}
        title="Drag or click to set (each tick = 10 minutes)"
      >
        {Array.from({ length: segments }, (_, i) => {
          const filled = i < value
          return (
            <div
              key={i}
              className={clsx(
                'h-full w-full rounded-sm',
                filled ? 'bg-slate-900' : 'bg-slate-100 ring-1 ring-inset ring-slate-200',
              )}
            />
          )
        })}
      </div>

      <div className="text-xs tabular-nums text-slate-600">
        <span className="font-semibold text-slate-900">{value * 10}m</span> / {segments * 10}m
      </div>
    </div>
  )
}

