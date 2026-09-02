import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'
import StatCard from '../../components/StatCard'

const emptyForm = {
  member_id: '',
  amount: '',
  date_paid: new Date().toISOString().slice(0, 10),
  payment_method: 'Cash',
  notes: '',
}

export default function AdminContributions() {
  const [rows, setRows] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [filterMember, setFilterMember] = useState('')

  const load = async () => {
    setLoading(true)
    const [{ data: contribs }, { data: mem }] = await Promise.all([
      supabase.from('contributions').select('*, members(full_name)').order('date_paid', { ascending: false }),
      supabase.from('members').select('id, full_name').eq('status', 'active').order('full_name'),
    ])
    setRows(contribs ?? [])
    setMembers(mem ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setForm({ ...emptyForm, member_id: members[0]?.id ?? '' })
    setError('')
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { error } = await supabase.from('contributions').insert({
      ...form,
      amount: Number(form.amount),
    })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setModalOpen(false)
    load()
  }

  const handleDelete = async (row) => {
    if (!confirm('Delete this contribution record?')) return
    await supabase.from('contributions').delete().eq('id', row.id)
    load()
  }

  const filtered = filterMember ? rows.filter((r) => r.member_id === filterMember) : rows
  const total = filtered.reduce((sum, r) => sum + Number(r.amount), 0)

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Contributions</h1>
          <p className="mt-1 text-sm text-ink/60">Record and review member payments.</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary">+ Record Payment</button>
      </div>

      <StatCard label={filterMember ? 'Filtered Total' : 'Total Group Contributions'} value={`KES ${total.toLocaleString()}`} accent="gold" />

      <select className="input max-w-sm" value={filterMember} onChange={(e) => setFilterMember(e.target.value)}>
        <option value="">All members</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>{m.full_name}</option>
        ))}
      </select>

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState title="No contributions recorded yet" />
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink/50">
                <th className="px-4 py-3 font-medium">Member</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Method</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{r.members?.full_name ?? 'Unknown'}</td>
                  <td className="px-4 py-3">KES {Number(r.amount).toLocaleString()}</td>
                  <td className="px-4 py-3 text-ink/60">{new Date(r.date_paid).toLocaleDateString('en-KE')}</td>
                  <td className="px-4 py-3">{r.payment_method}</td>
                  <td className="px-4 py-3 text-ink/60">{r.notes || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => handleDelete(r)} className="text-sm text-clay hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal title="Record Payment" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="label">Member</label>
              <select required className="input" value={form.member_id}
                onChange={(e) => setForm({ ...form, member_id: e.target.value })}>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Amount (KES)</label>
                <input required type="number" min="1" step="0.01" className="input" value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </div>
              <div>
                <label className="label">Date Paid</label>
                <input required type="date" className="input" value={form.date_paid}
                  onChange={(e) => setForm({ ...form, date_paid: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Payment Method</label>
              <select className="input" value={form.payment_method}
                onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
                <option>Cash</option>
                <option>M-Pesa</option>
                <option>Bank Transfer</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <textarea className="input" rows={2} value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>

            {error && <p className="text-sm text-clay">{error}</p>}

            <button type="submit" disabled={saving} className="btn btn-primary w-full">
              {saving ? 'Saving…' : 'Save Payment'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
