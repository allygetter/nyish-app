import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { Input } from '../components/Input'
import { EmptyState } from '../components/EmptyState'
import { Plus, Wallet, ArrowDownLeft } from 'lucide-react'
import { formatCurrency, formatDate } from '../utils/helpers'

export function Savings() {
  const { profile, canManageSavings } = useAuth()
  const [contributions, setContributions] = useState([])
  const [members, setMembers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: contributions }, { data: members }] = await Promise.all([
        supabase.from('contributions').select('*, profiles(full_name)').order('date', { ascending: false }),
        supabase.from('profiles').select('id, full_name').eq('status', 'approved'),
      ])
      setContributions(contributions || [])
      setMembers(members || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const total = contributions.reduce((sum, c) => sum + c.amount, 0)

  const handleAdd = async (e) => {
    e.preventDefault()
    const form = e.target
    const { error } = await supabase.from('contributions').insert({
      member_id: form.member_id.value,
      amount: Number(form.amount.value),
      date: form.date.value,
      notes: form.notes.value,
      created_by: profile.id,
    })
    if (!error) {
      setShowModal(false)
      const { data } = await supabase.from('contributions').select('*, profiles(full_name)').order('date', { ascending: false })
      setContributions(data || [])
    }
  }

  if (loading) return <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}</div>

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-gradient-to-br from-primary-500 to-emerald-700 rounded-2xl p-6 text-white shadow-xl shadow-primary-600/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-primary-100 text-sm font-medium">Total Savings</span>
          <Wallet size={20} className="text-primary-200" />
        </div>
        <p className="text-3xl font-bold font-display">{formatCurrency(total)}</p>
        <p className="text-primary-200 text-xs mt-1">{contributions.length} contributions</p>
      </div>

      {canManageSavings && (
        <Button onClick={() => setShowModal(true)} className="w-full">
          <Plus size={18} className="mr-2" /> Record Contribution
        </Button>
      )}

      <div className="space-y-2.5">
        {contributions.length === 0 ? (
          <EmptyState title="No contributions yet" description="Start recording savings to see them here" />
        ) : (
          contributions.map((c) => (
            <div key={c.id} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center flex-shrink-0">
                <ArrowDownLeft className="text-emerald-600 dark:text-emerald-400" size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{c.profiles?.full_name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(c.date)} · {c.notes || 'Contribution'}</p>
              </div>
              <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(c.amount)}</span>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Contribution">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Member</label>
            <select name="member_id" required className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20">
              <option value="">Select member</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <Input name="amount" type="number" placeholder="Amount (KES)" required min="1" />
          <Input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
          <Input name="notes" placeholder="Notes (optional)" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
