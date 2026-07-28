import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { queueWrite } from '../lib/offlineQueue.js'
import { COLORS, FONTS, formatCurrency, formatDate, getAvatarColor, getInitials } from '../lib/styles.js'
import { Plus, X, CheckCircle, XCircle, ArrowRight, Clock, Check, Landmark, User } from 'lucide-react'

export default function LoansScreen({ user, profile, isOfficial }) {
  const [loans, setLoans] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showRepay, setShowRepay] = useState(null)
  const [form, setForm] = useState({ amount: '', purpose: '' })
  const [repayAmount, setRepayAmount] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadLoans()
    const sub = supabase.channel('loans-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, loadLoans)
      .subscribe()
    return () => sub.unsubscribe()
  }, [user])

  async function loadLoans() {
    setLoading(true)
    let q = supabase.from('loans').select('*, members(name, photo, id)').order('date_requested', { ascending: false })
    if (!isOfficial) q = q.eq('member_id', user.id)
    const { data } = await q
    setLoans(data || [])
    setLoading(false)
  }

  async function handleRequest(e) {
    e.preventDefault()
    const payload = { member_id: user.id, amount: parseFloat(form.amount), purpose: form.purpose, status: 'pending' }
    if (!navigator.onLine) { await queueWrite('loans', payload); setShowForm(false); setForm({ amount: '', purpose: '' }); loadLoans(); return }
    const { error } = await supabase.from('loans').insert(payload)
    if (error) { alert(error.message); return }
    setShowForm(false); setForm({ amount: '', purpose: '' }); loadLoans()
  }

  async function handleApprove(loanId, decision) {
    const { error } = await supabase.from('loans').update({
      status: decision,
      approvals: [{ by: user.id, decision, date: new Date().toISOString() }]
    }).eq('id', loanId)
    if (error) alert(error.message)
    else loadLoans()
  }

  async function handleRepay(loan) {
    const amount = parseFloat(repayAmount)
    if (!amount || amount <= 0) return
    const repayments = [...(loan.repayments || []), { amount, date: new Date().toISOString(), by: user.id }]
    const newBalance = (loan.balance || 0) - amount
    const status = newBalance <= 0 ? 'repaid' : 'approved'
    const { error } = await supabase.from('loans').update({
      repayments,
      balance: Math.max(0, newBalance),
      status
    }).eq('id', loan.id)
    if (error) alert(error.message)
    else { setShowRepay(null); setRepayAmount(''); loadLoans() }
  }

  const statusColors = {
    pending: { bg: '#FEF3C7', text: '#B45309', icon: Clock },
    approved: { bg: '#D1FAE5', text: '#065F46', icon: CheckCircle },
    rejected: { bg: '#FEE2E2', text: '#991B1B', icon: XCircle },
    repaid: { bg: '#DBEAFE', text: '#1E40AF', icon: Check },
  }

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      {/* Request Loan */}
      <button onClick={() => setShowForm(true)} style={{
        width: '100%', padding: 14, borderRadius: 14, border: `2px dashed ${COLORS.blue}`,
        background: COLORS.blue + '08', color: COLORS.blue, fontSize: 15, fontWeight: 600,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20
      }}>
        <Plus size={20} /> Request Loan
      </button>

      {/* Form Modal */}
      {showForm && (
        <div style={modalOverlay} onClick={() => setShowForm(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: FONTS.display, fontSize: 20, color: COLORS.brown }}>Request Loan</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color={COLORS.brown} />
              </button>
            </div>
            <form onSubmit={handleRequest}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Amount (KES)</label>
                <input type="number" min="1" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={inputStyle} placeholder="e.g. 10000" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Purpose</label>
                <input required value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} style={inputStyle} placeholder="e.g. School fees" />
              </div>
              <button type="submit" style={{ ...primaryBtn, width: '100%' }}>Submit Request</button>
            </form>
          </div>
        </div>
      )}

      {/* Repay Modal */}
      {showRepay && (
        <div style={modalOverlay} onClick={() => setShowRepay(null)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: FONTS.display, fontSize: 20, color: COLORS.brown, marginBottom: 16 }}>Record Repayment</h3>
            <p style={{ fontSize: 14, color: COLORS.textLight, marginBottom: 12 }}>
              Outstanding: <strong>{formatCurrency(showRepay.balance)}</strong>
            </p>
            <input type="number" min="1" max={showRepay.balance} value={repayAmount} onChange={e => setRepayAmount(e.target.value)} style={inputStyle} placeholder="Amount to repay" />
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={() => setShowRepay(null)} style={{ flex: 1, padding: 14, borderRadius: 12, border: `1px solid ${COLORS.border}`, background: '#fff', color: COLORS.brown, cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => handleRepay(showRepay)} style={{ flex: 1, ...primaryBtn }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* Loans List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 100, background: COLORS.creamDark, borderRadius: 14 }} />)}
        </div>
      ) : loans.length === 0 ? (
        <p style={{ textAlign: 'center', color: COLORS.textMuted, padding: 40 }}>No loan records.</p>
      ) : (
        loans.map(loan => {
          const st = statusColors[loan.status] || statusColors.pending
          const StIcon = st.icon
          return (
            <div key={loan.id} style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${COLORS.border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', background: getAvatarColor(loan.member_id),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0
                }}>
                  {loan.members?.photo ? <img src={loan.members.photo} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(loan.members?.name)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, color: COLORS.brown }}>{loan.members?.name}</p>
                  <p style={{ fontSize: 12, color: COLORS.textLight }}>{formatDate(loan.date_requested)}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: st.bg }}>
                  <StIcon size={14} color={st.text} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: st.text, textTransform: 'capitalize' }}>{loan.status}</span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div><p style={{ fontSize: 11, color: COLORS.textMuted }}>Amount</p><p style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 700, color: COLORS.brown }}>{formatCurrency(loan.amount)}</p></div>
                <div><p style={{ fontSize: 11, color: COLORS.textMuted }}>Interest</p><p style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 700, color: COLORS.brown }}>{formatCurrency(loan.interest_amount || 0)}</p></div>
                <div><p style={{ fontSize: 11, color: COLORS.textMuted }}>Total Due</p><p style={{ fontFamily: FONTS.display, fontSize: 14, fontWeight: 700, color: COLORS.brown }}>{formatCurrency(loan.total_due || loan.amount)}</p></div>
              </div>

              <p style={{ fontSize: 13, color: COLORS.textLight, marginBottom: 12 }}><strong>Purpose:</strong> {loan.purpose}</p>

              {loan.status === 'approved' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: COLORS.creamDark, borderRadius: 10, marginBottom: 10 }}>
                  <span style={{ fontSize: 13, color: COLORS.textLight }}>Balance remaining</span>
                  <span style={{ fontFamily: FONTS.display, fontSize: 16, color: COLORS.red, fontWeight: 700 }}>{formatCurrency(loan.balance || 0)}</span>
                </div>
              )}

              {loan.repayments?.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.brown, marginBottom: 6 }}>Repayments</p>
                  {loan.repayments.map((r, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: COLORS.textLight, padding: '4px 0' }}>
                      <span>{formatDate(r.date)}</span>
                      <span style={{ color: COLORS.green, fontWeight: 600 }}>+{formatCurrency(r.amount).replace('KES ', '')}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 8 }}>
                {isOfficial && loan.status === 'pending' && (
                  <>
                    <button onClick={() => handleApprove(loan.id, 'approved')} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: COLORS.green, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Approve
                    </button>
                    <button onClick={() => handleApprove(loan.id, 'rejected')} style={{ flex: 1, padding: 10, borderRadius: 10, border: `1px solid ${COLORS.red}`, background: '#fff', color: COLORS.red, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                      Reject
                    </button>
                  </>
                )}
                {loan.status === 'approved' && loan.member_id === user.id && (
                  <button onClick={() => setShowRepay(loan)} style={{ flex: 1, padding: 10, borderRadius: 10, border: 'none', background: COLORS.blue, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    Make Repayment
                  </button>
                )}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

const modalOverlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100,
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
}
const modalContent = {
  background: COLORS.cream, width: '100%', maxWidth: 480, borderRadius: '24px 24px 0 0',
  padding: 24, maxHeight: '85vh', overflowY: 'auto'
}
const labelStyle = { fontSize: 13, color: COLORS.textLight, marginBottom: 6, display: 'block' }
const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${COLORS.border}`,
  fontSize: 15, color: COLORS.brown, background: '#fff', outline: 'none'
}
const primaryBtn = {
  padding: '14px', borderRadius: 12, border: 'none',
  background: COLORS.brown, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer'
}
