import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import Loading from '../components/Loading'
import EmptyState from '../components/EmptyState'

export default function PublicAnnouncements() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setItems(data ?? [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="min-h-screen bg-cream px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <Link to="/" className="text-sm text-forest hover:underline">
          ← Back home
        </Link>
        <h1 className="mt-4 text-2xl font-bold md:text-3xl">Announcements</h1>
        <p className="mt-1 text-sm text-ink/60">Latest updates from NYISH.</p>

        <div className="mt-6 space-y-3">
          {loading && <Loading />}
          {!loading && items.length === 0 && (
            <EmptyState title="No announcements yet" hint="Check back soon for updates." />
          )}
          {items.map((a) => (
            <div key={a.id} className="card">
              <p className="font-display font-semibold text-forest-dark">{a.title}</p>
              <p className="mt-1 whitespace-pre-line text-sm text-ink/70">{a.content}</p>
              <p className="mt-2 text-xs text-ink/40">
                {new Date(a.created_at).toLocaleDateString('en-KE', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
