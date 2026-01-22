import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { Button } from '../components/ui'

export default function NotFoundPage() {
  return (
    <div className="min-h-full">
      <Header right={<Link to="/"><Button>Home</Button></Link>} />
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="text-sm font-semibold text-slate-900">Page not found</div>
          <div className="mt-1 text-sm text-slate-600">That route doesn’t exist.</div>
          <div className="mt-6">
            <Link to="/">
              <Button>Back to timeline</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

