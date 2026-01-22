export function toLocalDateInputValue(d: Date): string {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatDateLabel(yyyyMmDd: string): string {
  // Expect YYYY-MM-DD; fall back to raw input if parsing fails.
  const [y, m, d] = yyyyMmDd.split('-').map((s) => Number(s))
  if (!y || !m || !d) return yyyyMmDd
  const dt = new Date(y, m - 1, d)
  return dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

