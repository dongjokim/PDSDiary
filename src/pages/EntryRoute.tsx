import { useParams, useSearchParams } from 'react-router-dom'
import EntryPage from './EntryPage'

export default function EntryRoute() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const dateParam = searchParams.get('date')
  // Key forces a remount when switching between entries, avoiding setState-in-effect.
  return <EntryPage key={id ?? 'new'} entryId={id} initialDate={dateParam ?? undefined} />
}

