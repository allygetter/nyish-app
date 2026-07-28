import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { queueWrite } from '../lib/offlineQueue.js'
import { COLORS, FONTS, formatDate, getAvatarColor, getInitials } from '../lib/styles.js'
import { Plus, X, Calendar, Users, FileText, Check, ChevronDown, ChevronUp } from 'lucide-react'

export default function MeetingsScreen({ user, profile, isOfficial }) {
  const [meetings, setMeetings] = useState([])
  const [members, setMembers] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], agenda: '', minutes: '', attendance: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadMeetings()
    const sub = supabase.channel('meetings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, loadMeetings)
      .subscribe()
    return () => sub.unsubscribe()
  }, [user])

  async function loadMeetings() {
    setLoading(true)
    const { data } = await supabase.from('meetings').select('*, members(name)').order('date', { ascending: false })
    setMeetings(data || [])
    const { data: m } = await supabase.from('members').select('id, name, photo').eq('status', 'active')
    setMembers(m || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = {
      date: form.date,
      agenda: form.agenda,
      minutes: form.minutes,
      attendance: form.attendance,
      created_by: user.id,
    }
    if (!navigator.onLine) { await queueWrite('meetings', payload); setShowForm(false); resetForm(); loadMeetings(); return }
    const { error } = await supabase.from('meetings').insert(payload)
    if (error) alert(error.message)
    else { setShowForm(false); resetForm(); loadMeetings() }
  }

  function resetForm() {
    setForm({ date: new Date().toISOString().split('T')[0], agenda: '', minutes: '', attendance: [] })
  }

  function toggleAttendance(id) {
    setForm(f => ({
      ...f,
      attendance: f.attendance.includes(id) ? f.attendance.filter(x => x !== id) : [...f.attendance, id]
    }))
  }

  const canCreate = profile?.role === 'chair' || profile?.role === 'secretary'

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      {canCreate && (
        <button onClick={() => setShowForm(true)} style={{
          width: '100%', padding: 14, borderRadius: 14, border: `2px dashed ${COLORS.brownLight}`,
          background: COLORS.brownLight + '08', color: COLORS.brownLight, fontSize: 15, fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20
        }}>
          <Plus size={20} /> Log Meeting
        </button>
      )}

      {showForm && (
        <div style={modalOverlay} onClick={() => setShowForm(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: FONTS.display, fontSize: 20, color: COLORS.brown }}>Log Meeting</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color={COLORS.brown} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Date</label>
                <input type="date" required value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Agenda</label>
                <textarea required rows={3} value={form.agenda} onChange={e => setForm(f => ({ ...f, agenda: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Meeting agenda items..." />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Minutes</label>
                <textarea rows={4} value={form.minutes} onChange={e => setForm(f => ({ ...f, minutes: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Meeting minutes..." />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Attendance ({form.attendance.length} present)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {members.map(m => {
                    const present = form.attendance.includes(m.id)
                    return (
                      <button key={m.id} type="button" onClick={() => toggleAttendance(m.id)} style={{
                        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 20,
                        border: `1px solid ${present ? COLORS.green : COLORS.border}`,
                        background: present ? COLORS.green + '15' : '#fff',
                        color: present ? COLORS.green : COLORS.textLight,
                        fontSize: 13, cursor: 'pointer', fontWeight: 500
                      }}>
                        {present && <Check size={14} />}
                        {m.name}
                      </button>
                    )
                  })}
                </div>
              </div>
              <button type="submit" style={{ ...primaryBtn, width: '100%' }}>Save Meeting</button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3].map(i => <div key={i} style={{ height: 80, background: COLORS.creamDark, borderRadius: 14 }} />)}
        </div>
      ) : meetings.length === 0 ? (
        <p style={{ textAlign: 'center', color: COLORS.textMuted, padding: 40 }}>No meetings recorded.</p>
      ) : (
        meetings.map(m => (
          <div key={m.id} style={{ background: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${COLORS.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: COLORS.brownLight + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Calendar size={18} color={COLORS.brownLight} />
                </div>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: COLORS.brown }}>{formatDate(m.date)}</p>
                  <p style={{ fontSize: 12, color: COLORS.textLight }}>Logged by {m.members?.name}</p>
                </div>
              </div>
              <button onClick={() => setExpanded(expanded === m.id ? null : m.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                {expanded === m.id ? <ChevronUp size={20} color={COLORS.brown} /> : <ChevronDown size={20} color={COLORS.brown} />}
              </button>
            </div>
            <p style={{ fontSize: 14, color: COLORS.brown, fontWeight: 500, marginBottom: 8 }}>{m.agenda}</p>
            {expanded === m.id && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${COLORS.border}` }}>
                {m.minutes && (
                  <div style={{ marginBottom: 14 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.brown, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <FileText size={14} /> Minutes
                    </p>
                    <p style={{ fontSize: 13, color: COLORS.textLight, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.minutes}</p>
                  </div>
                )}
                {m.attendance?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 600, color: COLORS.brown, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} /> Attendance ({m.attendance.length})
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {m.attendance.map(id => {
                        const mem = members.find(x => x.id === id)
                        return (
                          <span key={id} style={{ fontSize: 12, padding: '4px 10px', background: COLORS.creamDark, borderRadius: 12, color: COLORS.brown }}>
                            {mem?.name || 'Member'}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
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
const primaryBtn = {
  padding: '14px', borderRadius: 12, border: 'none',
  background: COLORS.brown, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer'
}
