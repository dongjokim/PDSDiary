import { useRef, useState } from 'react'
import type { ChangeEventHandler } from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button } from '../components/ui'
import { Calendar } from '../components/Calendar'
import type { PdsEntry } from '../types/pds'
import { coerceImportedExport, makeExport } from '../lib/storage'
import { generateYearEndReport } from '../lib/reports'
import { useEntries } from '../state/EntriesContext'

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
export default function HomePage() {
  const { entries, replaceAll } = useEntries()
  const [notice, setNotice] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  const today = new Date()
  const [selectedYear, setSelectedYear] = useState(today.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth())

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11)
      setSelectedYear((y) => y - 1)
    } else {
      setSelectedMonth((m) => m - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0)
      setSelectedYear((y) => y + 1)
    } else {
      setSelectedMonth((m) => m + 1)
    }
  }

  const handleToday = () => {
    setSelectedYear(today.getFullYear())
    setSelectedMonth(today.getMonth())
  }

  const onExport = () => {
    const payload = makeExport(entries)
    const stamp = new Date().toISOString().slice(0, 10)
    downloadJson(`pds-diary-${stamp}.json`, payload)
    setNotice('Exported JSON file.')
  }

  const onExportYearReport = () => {
    const currentYear = new Date().getFullYear()
    const report = generateYearEndReport(entries, currentYear)
    downloadText(`pds-diary-${currentYear}-report.md`, report)
    setNotice(`Exported ${currentYear} year-end report.`)
  }

  const onPickImport = () => {
    setNotice(null)
    fileRef.current?.click()
  }

  const onImportFile: ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text) as unknown
      const imported = coerceImportedExport(parsed)
      if (!imported) {
        setNotice('Import failed: unsupported file format.')
        return
      }

      // Merge by id; prefer newer updatedAt
      const map = new Map<string, PdsEntry>()
      for (const existing of entries) map.set(existing.id, existing)
      for (const incoming of imported.entries) {
        const prev = map.get(incoming.id)
        if (!prev || incoming.updatedAt.localeCompare(prev.updatedAt) > 0) map.set(incoming.id, incoming)
      }

      const merged = Array.from(map.values()).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      replaceAll(merged)
      setNotice(`Imported ${imported.entries.length} entries (merged into ${merged.length} total).`)
    } catch {
      setNotice('Import failed: could not read JSON.')
    }
  }

  return (
    <div className="min-h-full">
      <Header
        right={
          <>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={onImportFile}
            />
            <Link to="/year">
              <Button variant="secondary">Year Overview</Button>
            </Link>
            <Link to={`/book/month?year=${selectedYear}&month=${selectedMonth}`}>
              <Button variant="secondary">Book Month</Button>
            </Link>
            <Link to="/goals">
              <Button variant="secondary">Goals</Button>
            </Link>
            <Button variant="secondary" onClick={onPickImport}>
              Import
            </Button>
            <Button variant="secondary" onClick={onExport} disabled={entries.length === 0}>
              Export JSON
            </Button>
            <Button variant="secondary" onClick={onExportYearReport} disabled={entries.length === 0}>
              Year Report
            </Button>
            <Link to="/new">
              <Button>New entry</Button>
            </Link>
          </>
        }
      />

      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-4">
          {/* Monthly Calendar */}
          <Calendar
            year={selectedYear}
            month={selectedMonth}
            entries={entries}
            onPrevMonth={handlePrevMonth}
            onNextMonth={handleNextMonth}
            onToday={handleToday}
          />

          {notice ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700 ring-1 ring-slate-200">
                {notice}
              </div>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  )
}

