import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'
import StatCard from '../../components/StatCard'

export default function MemberContributions() {
  const { profile } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    supabase
      .from('contributions')
      .select('*')
      .eq('member_id', profile.id)
      .order('date_paid', { ascending: false })
      .then(({ data }) => {
        setRows(data ?? [])
        setLoading(false)
      })
  }, [profile])

  const total = rows.reduce((sum, c) => sum + Number(c.amount), 0)

  if (loading) return <Loading />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Contributions</h1>
        <p className="mt-1 text-sm text-ink/60">Your full payment history with NYISH.</p>
      </div>

      <StatCard label="Total Contributed" value={`KES ${total.toLocaleString()}`} accent="gold" />

      {rows.length === 0 ? (
        <EmptyState title="No contributions recorded yet" hint="Your payments will appear here once recorded by the administrator." />
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink/50">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">{new Date(r.date_paid).toLocaleDateString('en-KE')}</td>
                  <td className="px-4 py-3 font-medium">KES {Number(r.amount).toLocaleString()}</td>
                  <td className="px-4 py-3">{r.payment_method}</td>
                  <td className="px-4 py-3 text-ink/60">{r.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
