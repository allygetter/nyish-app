import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'

export default function MemberMeetings() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('meetings')
      .select('*')
      .order('meeting_date', { ascending: false })
      .then(({ data }) => {
        setItems(data ?? [])
        setLoading(false)
      })
  }, [])

  if (loading) return <Loading />

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Meetings</h1>
      {items.length === 0 ? (
        <EmptyState title="No meetings scheduled yet" />
      ) : (
        <div className="space-y-3">
          {items.map((m) => (
            <div key={m.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display font-semibold text-forest-dark">{m.title}</p>
                  {m.location && <p className="text-sm text-ink/60">{m.location}</p>}
                </div>
                {m.meeting_date >= today && (
                  <span className="badge bg-gold/20 text-gold-dark shrink-0">Upcoming</span>
                )}
              </div>
              {m.description && <p className="mt-2 text-sm text-ink/70">{m.description}</p>}
              <p className="mt-2 text-xs text-ink/40">
                {new Date(m.meeting_date).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {m.meeting_time && ` · ${m.meeting_time}`}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
