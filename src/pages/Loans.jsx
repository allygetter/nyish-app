import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { Input } from '../components/Input'
import { EmptyState } from '../components/EmptyState'
import { Plus, CreditCard } from 'lucide-react'
import { formatCurrency, formatDate, cn } from '../utils/helpers'

export function Loans() {
  const { profile, canManageLoans } = useAuth()
  const [loans, setLoans] = useState([])
  const [members, setMembers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: loans }, { data: members }] = await Promise.all([
        supabase.from('loans').select('*, profiles(full_name), repayments(*)').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name').eq('status', 'approved'),
      ])
      setLoans(loans || [])
      setMembers(members || [])
      setLoading(false)
    }
    fetchData()
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    const form = e.target
    const { error } = await supabase.from('loans').insert({
      member_id: form.member_id.value,
      amount: Number(form.amount.value),
      interest: Number(form.interest.value) || 0,
      due_date: form.due_date.value,
      status: 'active',
      created_by: profile.id,
    })
    if (!error) {
      setShowModal(false)
      const { data } = await supabase.from('loans').select('*, profiles(full_name), repayments(*)').order('created_at', { ascending: false })
      setLoans(data || [])
    }
  }

  const activeLoans = loans.filter(l => l.status === 'active')
  const totalLoaned = activeLoans.reduce((sum, l) => sum + l.amount, 0)

  if (loading) return <div className="space-y-3 animate-pulse">{[1,2].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}</div>

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 text-white shadow-xl shadow-amber-600/20">
        <div className="flex items-center justify-between mb-2">
          <span className="text-amber-100 text-sm font-medium">Active Loans</span>
          <CreditCard size={20} className="text-amber-200" />
        </div>
        <p className="text-3xl font-bold font-display">{formatCurrency(totalLoaned)}</p>
        <p className="text-amber-200 text-xs mt-1">{activeLoans.length} active</p>
      </div>

      {canManageLoans && (
        <Button onClick={() => setShowModal(true)} className="w-full">
          <Plus size={18} className="mr-2" /> New Loan
        </Button>
      )}

      <div className="space-y-3">
        {loans.length === 0 ? (
          <EmptyState title="No loans recorded" description="Loans will appear here once created" />
        ) : (
          loans.map((loan) => {
            const repaid = loan.repayments?.reduce((s, r) => s + r.amount, 0) || 0
            const progress = Math.min((repaid / (loan.amount * (1 + (loan.interest || 0)/100))) * 100, 100)
            
            return (
              <div key={loan.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{loan.profiles?.full_name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Due {formatDate(loan.due_date)}</p>
                  </div>
                  <span className={cn('px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase', 
                    loan.status === 'active' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  )}>
                    {loan.status}
                  </span>
                </div>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Principal</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(loan.amount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 dark:text-slate-400">Interest</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">{loan.interest || 0}%</p>
                  </div>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-primary-500 to-emerald-400 h-full rounded-full transition-all" style={{ width: `${progress}%` }} />
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 text-right">{progress.toFixed(0)}% repaid</p>
              </div>
            )
          })
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Loan">
        <form onSubmit={handleAdd} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Member</label>
            <select name="member_id" required className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20">
              <option value="">Select member</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>
          <Input name="amount" type="number" placeholder="Loan amount (KES)" required min="1" />
          <Input name="interest" type="number" placeholder="Interest %" min="0" max="100" />
          <Input name="due_date" type="date" required />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">Create Loan</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
