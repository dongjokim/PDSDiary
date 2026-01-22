import { useSearchParams } from 'react-router-dom'
import BookMonthPage from './BookMonthPage'

export default function BookMonthRoute() {
  const [searchParams] = useSearchParams()
  const today = new Date()

  const yearParam = Number(searchParams.get('year') ?? '')
  const monthParam = Number(searchParams.get('month') ?? '') // 0-based

  const year = Number.isFinite(yearParam) ? yearParam : today.getFullYear()
  const month = Number.isFinite(monthParam) ? monthParam : today.getMonth()

  // Key forces a remount when switching months, keeping state logic simple.
  return <BookMonthPage key={`${year}-${month}`} year={year} month={month} />
}

