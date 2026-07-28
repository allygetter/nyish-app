import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { queueWrite } from '../lib/offlineQueue.js'
import { COLORS, FONTS, formatCurrency, formatDate, getAvatarColor, getInitials } from '../lib/styles.js'
import { Plus, X, ShieldAlert, Check, User } from 'lucide-react'

export default function FinesScreen({ user, profile, isOfficial }) {
  const [fines, setFines] = useState([])
  const [members, setMembers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ member_id: '', amount: '', reason: '' })
  const [loading, setLoading] = useState(true)
  const isChair = profile?.role === 'chair'

  useEffect(() => {
    if (!user) return
    loadFines()
    const sub = supabase.channel('fines-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fines' }, loadFines)
      .subscribe()
    return () => sub.unsubscribe()
  }, [user])

  async function loadFines() {
    setLoading(true)
    let q = supabase.from('fines').select('*, members(name, photo, id)').order('date', { ascending: false })
    if (!isOfficial) q = q.eq('member_id', user.id)
    const { data } = await q
    setFines(data || [])
    const { data: m } = await supabase.from('members').select('id, name, photo').eq('status', 'active')
    setMembers(m || [])
    setLoading(false)
  }

  async function handleIssue(e) {
    e.preventDefault()
    const payload = { member_id: form.member_id, amount: parseFloat(form.amount), reason: form.reason, recorded_by: user.id, status: 'unpaid' }
    if (!navigator.onLine) { await queueWrite('fines', payload); setShowForm(false); resetForm(); loadFines(); return }
    const { error } = await supabase.from('fines').insert(payload)
    if (error) alert(error.message)
    else { setShowForm(false); resetForm(); loadFines() }
  }

  async function handleMarkPaid(id) {
    const { error } = await supabase.from('fines').update({ status: 'paid' }).eq('id', id)
    if (error) alert(error.message)
    else loadFines()
  }

  function resetForm() { setForm({ member_id: '', amount: '', reason: '' }) }

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      {isChair && (
        <button onClick={() => setShowForm(true)} style={{
          width: '100%', padding: 14, borderRadius: 14, border: `2px dashed ${COLORS.red}`,
          background: COLORS.red + '08', color: COLORS.red, fontSize: 15, fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20
        }}>
          <Plus size={20} /> Issue Fine
        </button>
      )}

      {showForm && (
        <div style={modalOverlay} onClick={() => setShowForm(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: FONTS.display, fontSize: 20, color: COLORS.brown }}>Issue Fine</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color={COLORS.brown} />
              </button>
            </div>
            <form onSubmit={handleIssue}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Member</label>
                <select required value={form.member_id} onChange={e => setForm(f => ({ ...f, member_id: e.target.value }))} style={selectStyle}>
                  <option value="">Select member</option>
                  {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Amount (KES)</label>
                <input type="number" min="1" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={inputStyle} placeholder="e.g. 500" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Reason</label>
                <input required value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} style={inputStyle} placeholder="e.g. Late to meeting" />
              </div>
              <button type="submit" style={{ ...primaryBtn, width: '100%' }}>Issue Fine</button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 80, background: COLORS.creamDark, borderRadius: 14 }} />)}
        </div>
      ) : fines.length === 0 ? (
        <p style={{ textAlign: 'center', color: COLORS.textMuted, padding: 40 }}>No fines recorded.</p>
      ) : (
        fines.map(f => (
          <div key={f.id} style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: getAvatarColor(f.member_id),
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0
            }}>
              {f.members?.photo ? <img src={f.members.photo} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(f.members?.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: COLORS.brown }}>{f.members?.name}</p>
              <p style={{ fontSize: 12, color: COLORS.textLight }}>{f.reason}</p>
              <p style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>{formatDate(f.date)}</p>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{ fontFamily: FONTS.display, fontSize: 16, color: COLORS.red, fontWeight: 700 }}>{formatCurrency(f.amount)}</p>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 12,
                fontSize: 11, fontWeight: 600, marginTop: 4,
                background: f.status === 'paid' ? '#D1FAE5' : '#FEE2E2',
                color: f.status === 'paid' ? '#065F46' : '#991B1B'
              }}>
                {f.status === 'paid' ? <Check size={12} /> : <ShieldAlert size={12} />}
                {f.status}
              </span>
            </div>
            {isOfficial && f.status === 'unpaid' && (
              <button onClick={() => handleMarkPaid(f.id)} style={{
                padding: '8px 14px', borderRadius: 10, border: 'none', background: COLORS.green,
                color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0
              }}>
                Mark Paid
              </button>
            )}
          </div>
        ))
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
const selectStyle = { ...inputStyle, cursor: 'pointer' }
const primaryBtn = {
  padding: '14px', borderRadius: 12, border: 'none',
  background: COLORS.brown, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer'
}
