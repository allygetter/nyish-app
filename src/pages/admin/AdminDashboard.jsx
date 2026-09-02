import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../../components/Loading'
import StatCard from '../../components/StatCard'
import EmptyState from '../../components/EmptyState'

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalMembers: 0,
    activeMembers: 0,
    totalContributions: 0,
    upcomingMeetings: 0,
  })
  const [recentPayments, setRecentPayments] = useState([])

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().slice(0, 10)
      const [members, contributions, meetings, recent] = await Promise.all([
        supabase.from('members').select('id, status'),
        supabase.from('contributions').select('amount'),
        supabase.from('meetings').select('id').gte('meeting_date', today),
        supabase
          .from('contributions')
          .select('*, members(full_name)')
          .order('date_paid', { ascending: false })
          .limit(5),
      ])

      const totalMembers = members.data?.length ?? 0
      const activeMembers = members.data?.filter((m) => m.status === 'active').length ?? 0
      const totalContributions = (contributions.data ?? []).reduce((sum, c) => sum + Number(c.amount), 0)
      const upcomingMeetings = meetings.data?.length ?? 0

      setStats({ totalMembers, activeMembers, totalContributions, upcomingMeetings })
      setRecentPayments(recent.data ?? [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Loading />

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="mt-1 text-sm text-ink/60">Group overview at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total Members" value={stats.totalMembers} />
        <StatCard label="Active Members" value={stats.activeMembers} accent="gold" />
        <StatCard label="Total Contributions" value={`KES ${stats.totalContributions.toLocaleString()}`} accent="gold" />
        <StatCard label="Upcoming Meetings" value={stats.upcomingMeetings} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Link to="/admin/members" className="card hover:border-forest">
          <p className="font-display font-semibold text-forest-dark">Manage Members</p>
          <p className="mt-1 text-sm text-ink/60">Add, edit, or deactivate group members.</p>
        </Link>
        <Link to="/admin/contributions" className="card hover:border-forest">
          <p className="font-display font-semibold text-forest-dark">Record Contributions</p>
          <p className="mt-1 text-sm text-ink/60">Log member payments and savings.</p>
        </Link>
        <Link to="/admin/announcements" className="card hover:border-forest">
          <p className="font-display font-semibold text-forest-dark">Post Announcements</p>
          <p className="mt-1 text-sm text-ink/60">Share updates with all members.</p>
        </Link>
        <Link to="/admin/meetings" className="card hover:border-forest">
          <p className="font-display font-semibold text-forest-dark">Schedule Meetings</p>
          <p className="mt-1 text-sm text-ink/60">Plan upcoming group meetings.</p>
        </Link>
      </div>

      <section>
        <h2 className="text-lg font-bold">Recent Payments</h2>
        <div className="mt-3">
          {recentPayments.length === 0 ? (
            <EmptyState title="No payments recorded yet" />
          ) : (
            <div className="card overflow-x-auto !p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-ink/50">
                    <th className="px-4 py-3 font-medium">Member</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.map((p) => (
                    <tr key={p.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3">{p.members?.full_name ?? 'Unknown'}</td>
                      <td className="px-4 py-3 font-medium">KES {Number(p.amount).toLocaleString()}</td>
                      <td className="px-4 py-3 text-ink/60">{new Date(p.date_paid).toLocaleDateString('en-KE')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
