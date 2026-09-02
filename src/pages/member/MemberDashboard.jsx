import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'
import StatCard from '../../components/StatCard'

export default function MemberDashboard() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [announcements, setAnnouncements] = useState([])
  const [meetings, setMeetings] = useState([])
  const [totalContributions, setTotalContributions] = useState(0)
  const [recentPayment, setRecentPayment] = useState(null)

  useEffect(() => {
    if (!profile) return
    let mounted = true

    async function load() {
      const [{ data: ann }, { data: mtg }, { data: contribs }] = await Promise.all([
        supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(3),
        supabase
          .from('meetings')
          .select('*')
          .gte('meeting_date', new Date().toISOString().slice(0, 10))
          .order('meeting_date', { ascending: true })
          .limit(3),
        supabase
          .from('contributions')
          .select('*')
          .eq('member_id', profile.id)
          .order('date_paid', { ascending: false }),
      ])

      if (!mounted) return
      setAnnouncements(ann ?? [])
      setMeetings(mtg ?? [])
      const total = (contribs ?? []).reduce((sum, c) => sum + Number(c.amount), 0)
      setTotalContributions(total)
      setRecentPayment(contribs?.[0] ?? null)
      setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [profile])

  if (loading) return <Loading />

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Karibu, {profile?.full_name?.split(' ')[0]} 👋</h1>
          <p className="mt-1 text-sm text-ink/60">Here's what's happening in NYISH.</p>
        </div>
        {profile?.role === 'admin' && (
          <Link to="/admin" className="btn btn-outline shrink-0">Go to Admin Dashboard</Link>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <StatCard label="My Total Contributions" value={`KES ${totalContributions.toLocaleString()}`} accent="gold" />
        <StatCard label="Last Payment" value={recentPayment ? `KES ${Number(recentPayment.amount).toLocaleString()}` : '—'} />
        <StatCard label="Status" value={profile?.status === 'active' ? 'Active' : 'Inactive'} />
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Latest Announcements</h2>
          <Link to="/dashboard/announcements" className="text-sm text-forest hover:underline">View all</Link>
        </div>
        <div className="mt-3 space-y-3">
          {announcements.length === 0 && <EmptyState title="No announcements yet" />}
          {announcements.map((a) => (
            <div key={a.id} className="card">
              <p className="font-display font-semibold text-forest-dark">{a.title}</p>
              <p className="mt-1 line-clamp-2 text-sm text-ink/70">{a.content}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Upcoming Meetings</h2>
          <Link to="/dashboard/meetings" className="text-sm text-forest hover:underline">View all</Link>
        </div>
        <div className="mt-3 space-y-3">
          {meetings.length === 0 && <EmptyState title="No upcoming meetings" />}
          {meetings.map((m) => (
            <div key={m.id} className="card flex items-center justify-between">
              <div>
                <p className="font-display font-semibold text-forest-dark">{m.title}</p>
                <p className="text-sm text-ink/60">{m.location}</p>
              </div>
              <div className="text-right text-sm text-ink/70">
                <p>{new Date(m.meeting_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</p>
                {m.meeting_time && <p className="text-ink/50">{m.meeting_time}</p>}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
