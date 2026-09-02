import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'

const statusColors = {
  Planned: 'bg-line text-ink/60',
  Ongoing: 'bg-gold/20 text-gold-dark',
  Completed: 'bg-forest/10 text-forest-dark',
  Cancelled: 'bg-clay/10 text-clay',
}

export default function MemberActivities() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('activities')
      .select('*')
      .order('activity_date', { ascending: false })
      .then(({ data }) => {
        setItems(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Group Activities</h1>
      {items.length === 0 ? (
        <EmptyState title="No activities recorded yet" />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <p className="font-display font-semibold text-forest-dark">{a.name}</p>
                <span className={`badge shrink-0 ${statusColors[a.status] || 'bg-line'}`}>{a.status}</span>
              </div>
              {a.description && <p className="mt-2 text-sm text-ink/70">{a.description}</p>}
              <p className="mt-2 text-xs text-ink/40">
                {new Date(a.activity_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
