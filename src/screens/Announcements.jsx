import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { queueWrite } from '../lib/offlineQueue.js'
import { COLORS, FONTS, formatDate, getAvatarColor, getInitials } from '../lib/styles.js'
import { Plus, X, Megaphone, Image as ImageIcon, Trash2 } from 'lucide-react'

export default function AnnouncementsScreen({ user, profile }) {
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', image: '' })
  const [loading, setLoading] = useState(true)
  const isChair = profile?.role === 'chair'

  useEffect(() => {
    if (!user) return
    loadItems()
    const sub = supabase.channel('announcements-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, loadItems)
      .subscribe()
    return () => sub.unsubscribe()
  }, [user])

  async function loadItems() {
    setLoading(true)
    const { data } = await supabase.from('announcements').select('*, members(name, photo, id)').order('date', { ascending: false })
    setItems(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const payload = { title: form.title, body: form.body, image: form.image || null, posted_by: user.id }
    if (!navigator.onLine) { await queueWrite('announcements', payload); setShowForm(false); resetForm(); loadItems(); return }
    const { error } = await supabase.from('announcements').insert(payload)
    if (error) alert(error.message)
    else { setShowForm(false); resetForm(); loadItems() }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this announcement?')) return
    const { error } = await supabase.from('announcements').delete().eq('id', id)
    if (error) alert(error.message)
    else loadItems()
  }

  function resetForm() { setForm({ title: '', body: '', image: '' }) }

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      {isChair && (
        <button onClick={() => setShowForm(true)} style={{
          width: '100%', padding: 14, borderRadius: 14, border: `2px dashed ${COLORS.gold}`,
          background: COLORS.gold + '08', color: COLORS.gold, fontSize: 15, fontWeight: 600,
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20
        }}>
          <Plus size={20} /> Post Announcement
        </button>
      )}

      {showForm && (
        <div style={modalOverlay} onClick={() => setShowForm(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontFamily: FONTS.display, fontSize: 20, color: COLORS.brown }}>New Announcement</h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} color={COLORS.brown} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Title</label>
                <input required value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={inputStyle} placeholder="Announcement title" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Body</label>
                <textarea required rows={4} value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Write your announcement..." />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Image URL (optional)</label>
                <input value={form.image} onChange={e => setForm(f => ({ ...f, image: e.target.value }))} style={inputStyle} placeholder="https://..." />
              </div>
              <button type="submit" style={{ ...primaryBtn, width: '100%' }}>Post</button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2].map(i => <div key={i} style={{ height: 120, background: COLORS.creamDark, borderRadius: 14 }} />)}
        </div>
      ) : items.length === 0 ? (
        <p style={{ textAlign: 'center', color: COLORS.textMuted, padding: 40 }}>No announcements yet.</p>
      ) : (
        items.map(item => (
          <div key={item.id} style={{ background: '#fff', borderRadius: 16, marginBottom: 14, border: `1px solid ${COLORS.border}`, overflow: 'hidden' }}>
            {item.image && (
              <img src={item.image} style={{ width: '100%', height: 180, objectFit: 'cover' }} />
            )}
            <div style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', background: getAvatarColor(item.members?.id || item.id),
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 12, flexShrink: 0
                  }}>
                    {item.members?.photo ? <img src={item.members.photo} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(item.members?.name)}
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: 13, color: COLORS.brown }}>{item.members?.name}</p>
                    <p style={{ fontSize: 11, color: COLORS.textMuted }}>{formatDate(item.date)}</p>
                  </div>
                </div>
                {isChair && (
                  <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <Trash2 size={16} color={COLORS.red} />
                  </button>
                )}
              </div>
              <h4 style={{ fontFamily: FONTS.display, fontSize: 16, color: COLORS.brown, marginBottom: 8, fontWeight: 600 }}>{item.title}</h4>
              <p style={{ fontSize: 14, color: COLORS.textLight, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{item.body}</p>
            </div>
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
