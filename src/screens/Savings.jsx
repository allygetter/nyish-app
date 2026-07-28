import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { queueWrite } from '../lib/offlineQueue.js'
import { COLORS, FONTS, formatCurrency, formatDate, getAvatarColor, getInitials } from '../lib/styles.js'
import { Plus, ArrowUpRight, ArrowDownRight, X, User, Calendar, FileText } from 'lucide-react'

export default function SavingsScreen({ user, profile, isOfficial }) {
  const [entries, setEntries] = useState([])
  const [members, setMembers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0], note: '', member_id: user?.id, source: 'cash' })
  const [loading, setLoading] = useState(true)
  const [myTotal, setMyTotal] = useState(0)
  const [groupTotal, setGroupTotal] = useState(0)

  useEffect(() => {
    if (!user) return
    loadData()
    const sub = supabase.channel('savings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'savings' }, loadData)
      .subscribe()
    return () => sub.unsubscribe()
  }, [user])

  async function loadData() {
    setLoading(true)
    let q = supabase.from('savings').select('*, members(name, photo, id)').order('date', { ascending: false })
    if (!isOfficial) q = q.eq('member_id', user.id)
    const { data } = await q
    setEntries(data || [])

    const { data: all } = await supabase.from('savings').select('amount, member_id')
    setGroupTotal((all || []).reduce((s, r) => s + (r.amount || 0), 0))
    setMyTotal((all || []).filter(r => r.member_id === user.id).reduce((s, r) => s + (r.amount || 0), 0))

    if (isOfficial) {
      const { data: m } = await supabase.from('members').select('id, name, photo').eq('status', 'active')
      setMembers(m || [])
    }
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      member_id: form.member_id || user.id,
      amount: parseFloat(form.amount),
      date: form.date,
      note: form.note,
      recorded_by: user.id,
      source: form.source,
    }
    if (!navigator.onLine) {
      await queueWrite('savings', payload)
      setShowForm(false)
      setForm({ amount: '', date: new Date().toISOString().split('T')[0], note: '', member_id: user.id, source: 'cash' })
      loadData()
      return
    }
    const { error } = await supabase.from('savings').insert(payload)
    if (error) { alert(error.message); return }
    setShowForm(false)
    setForm({ amount: '', date: new Date().toISOString().split('T')[0], note: '', member_id: user.id, source: 'cash' })
    loadData()
  }

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      {/* Totals */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: `1px solid ${COLORS.border}` }}>
          <p style={{ fontSize: 12, color: COLORS.textLight, marginBottom: 4 }}>My Total</p>
          <p style={{ fontFamily: FONTS.display, fontSize: 20, color: COLORS.green, fontWeight: 700 }}>{formatCurrency(myTotal)}</p>
        </div>
        <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: `1px solid ${COLORS.border}` }}>
          <p style={{ fontSize: 12, color: COLORS.textLight, marginBottom: 4 }}>Group Total</p>
          <p style={{ fontFamily: FONTS.display, fontSize: 20, color: COLORS.brown, fontWeight: 700 }}>{formatCurrency(groupTotal)}</p>
        </div>
      </div>

      {/* Add Button */}
      <button onClick={() => setShowForm(true)} style={{
        width: '100%', padding: 14, borderRadius: 14, border: `2px dashed ${COLORS.gold}`,
        background: COLORS.gold + '08', color: COLORS.gold, fontSize: 15, fontWeight: 600,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20
      }}>
        <Plus size={20} /> Log Contribution
      </button>

      {/* Form Modal */}
      {showForm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }} onClick={() => setShowForm(false)}>
          <div style={{
            background: COLORS.cream, width: '100%', maxWidth: 480, borderRadius: '24px 24px 0 0',
            padding: 24, maxHeight: '85vh', overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: FONTS.display, fontSize: 20, color: COLORS.brown }}>Log Contribution</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color={COLORS.brown} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              {isOfficial && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 13, color: COLORS.textLight, marginBottom: 6, display: 'block' }}>Member</label>
                  <select value={form.member_id} onChange={e => setForm(f => ({ ...f, member_id: e.target.value }))} style={selectStyle}>
                    <option value={user.id}>Myself</option>
                    {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: COLORS.textLight, marginBottom: 6, display: 'block' }}>Amount (KES)</label>
                <input type="number" min="1" required value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} style={inputStyle} placeholder="e.g. 5000" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: COLORS.textLight, marginBottom: 6, display: 'block' }}>Date</label>
                <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: COLORS.textLight, marginBottom: 6, display: 'block' }}>Source</label>
                <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} style={selectStyle}>
                  <option value="cash">Cash</option>
                  <option value="mpesa">M-Pesa</option>
                  <option value="bank">Bank Transfer</option>
                </select>
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: COLORS.textLight, marginBottom: 6, display: 'block' }}>Note (optional)</label>
                <input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} style={inputStyle} placeholder="e.g. Monthly contribution" />
              </div>
              <button type="submit" style={{ ...primaryBtn, width: '100%' }}>Save Contribution</button>
            </form>
          </div>
        </div>
      )}

      {/* Entries List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 72, background: COLORS.creamDark, borderRadius: 14 }} />)}
        </div>
      ) : entries.length === 0 ? (
        <p style={{ textAlign: 'center', color: COLORS.textMuted, padding: 40 }}>No savings recorded yet.</p>
      ) : (
        entries.map(entry => (
          <div key={entry.id} style={{
            background: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
            border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 12
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%', background: getAvatarColor(entry.member_id),
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0
            }}>
              {entry.members?.photo ? <img src={entry.members.photo} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(entry.members?.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: COLORS.brown }}>{entry.members?.name || 'Member'}</p>
              <p style={{ fontSize: 12, color: COLORS.textLight }}>{formatDate(entry.date)} · {entry.source}</p>
              {entry.note && <p style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{entry.note}</p>}
            </div>
            <p style={{ fontFamily: FONTS.display, fontSize: 16, color: COLORS.green, fontWeight: 700, flexShrink: 0 }}>
              +{formatCurrency(entry.amount).replace('KES ', '')}
            </p>
          </div>
        ))
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '12px 14px', borderRadius: 12, border: `1px solid ${COLORS.border}`,
  fontSize: 15, color: COLORS.brown, background: '#fff', outline: 'none'
}
const selectStyle = { ...inputStyle, cursor: 'pointer' }
const primaryBtn = {
  padding: '14px', borderRadius: 12, border: 'none',
  background: COLORS.brown, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer'
}
