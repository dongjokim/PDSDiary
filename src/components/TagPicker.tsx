import { useState } from 'react'
import { Badge, Button, Input } from './ui'
import { clsx } from '../lib/clsx'

function normalizeTag(raw: string): string {
  return raw.replace(/#/g, '').trim()
}

export function TagPicker({
  value,
  onChange,
  suggestions,
}: {
  value: string[]
  onChange: (next: string[]) => void
  suggestions: string[]
}) {
  const [input, setInput] = useState('')

  const toggleTag = (tag: string) => {
    const exists = value.some((t) => t.toLowerCase() === tag.toLowerCase())
    if (exists) {
      onChange(value.filter((t) => t.toLowerCase() !== tag.toLowerCase()))
    } else {
      onChange([...value, tag])
    }
  }

  const addFromInput = () => {
    const cleaned = normalizeTag(input)
    if (!cleaned) return
    const parts = cleaned
      .split(/[,\n]+/)
      .flatMap((chunk) => chunk.split(/\s+/))
      .map((t) => t.trim())
      .filter(Boolean)
    if (!parts.length) return
    const next = [...value]
    for (const tag of parts) {
      if (!next.some((t) => t.toLowerCase() === tag.toLowerCase())) next.push(tag)
    }
    onChange(next)
    setInput('')
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addFromInput()
            }
          }}
          placeholder="Add tag…"
        />
        <Button variant="secondary" onClick={addFromInput}>
          Add
        </Button>
      </div>

      {suggestions.length ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((tag) => {
            const selected = value.some((t) => t.toLowerCase() === tag.toLowerCase())
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={clsx(
                  'rounded-full px-2 py-0.5 text-xs font-medium ring-1 transition',
                  selected
                    ? 'bg-slate-900 text-white ring-slate-900'
                    : 'bg-slate-100 text-slate-700 ring-slate-200 hover:bg-slate-200',
                )}
              >
                {tag}
              </button>
            )
          })}
        </div>
      ) : null}

      {value.length ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <Badge key={tag}>{tag}</Badge>
          ))}
        </div>
      ) : null}
    </div>
  )
}

