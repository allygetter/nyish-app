import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { COLORS, FONTS, getAvatarColor, getInitials } from '../lib/styles.js'
import { Gift, ArrowRight, RotateCcw, Crown } from 'lucide-react'

export default function RotationScreen({ user, profile }) {
  const [rotation, setRotation] = useState({ order: [], current_index: 0 })
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const isChair = profile?.role === 'chair'

  useEffect(() => {
    loadData()
    const sub = supabase.channel('rotation-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nyish_store' }, loadData)
      .subscribe()
    return () => sub.unsubscribe()
  }, [])

  async function loadData() {
    setLoading(true)
    const [{ data: rot }, { data: mems }] = await Promise.all([
      supabase.from('nyish_store').select('value').eq('key', 'rotation').single(),
      supabase.from('members').select('id, name, photo').eq('status', 'active').order('join_date', { ascending: true })
    ])
    if (rot?.value) setRotation(rot.value)
    setMembers(mems || [])
    setLoading(false)
  }

  async function handleAdvance() {
    if (!isChair) return
    const nextIndex = (rotation.current_index + 1) % Math.max(rotation.order.length, 1)
    const { error } = await supabase.from('nyish_store').update({
      value: { ...rotation, current_index: nextIndex },
      updated_by: user.id
    }).eq('key', 'rotation')
    if (error) alert(error.message)
    else loadData()
  }

  async function handleReset() {
    if (!isChair || !confirm('Reset rotation to match current members?')) return
    const newOrder = members.map(m => m.id)
    const { error } = await supabase.from('nyish_store').update({
      value: { order: newOrder, current_index: 0 },
      updated_by: user.id
    }).eq('key', 'rotation')
    if (error) alert(error.message)
    else loadData()
  }

  const orderedMembers = rotation.order.map(id => members.find(m => m.id === id)).filter(Boolean)
  const currentId = rotation.order[rotation.current_index]
  const current = members.find(m => m.id === currentId)

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      <div style={{ background: 'linear-gradient(135deg, #F5F0E8 0%, #FFFDF8 100%)', borderRadius: 20, padding: 24, border: `1px solid ${COLORS.border}`, textAlign: 'center', marginBottom: 24 }}>
        <Gift size={32} color={COLORS.gold} style={{ marginBottom: 12 }} />
        <h2 style={{ fontFamily: FONTS.display, fontSize: 20, color: COLORS.brown, marginBottom: 8 }}>Merry-Go-Round</h2>
        <p style={{ fontSize: 14, color: COLORS.textLight, marginBottom: 16 }}>Current recipient</p>
        {current ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: getAvatarColor(current.id),
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 22
            }}>
              {current.photo ? <img src={current.photo} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(current.name)}
            </div>
            <p style={{ fontFamily: FONTS.display, fontSize: 18, color: COLORS.brown, fontWeight: 600 }}>{current.name}</p>
          </div>
        ) : (
          <p style={{ color: COLORS.textMuted }}>No active rotation</p>
        )}

        {isChair && (
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' }}>
            <button onClick={handleAdvance} style={{
              padding: '10px 20px', borderRadius: 12, border: 'none',
              background: COLORS.brown, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
            }}>
              <ArrowRight size={16} /> Advance Turn
            </button>
            <button onClick={handleReset} style={{
              padding: '10px 20px', borderRadius: 12, border: `1px solid ${COLORS.border}`,
              background: '#fff', color: COLORS.brown, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
            }}>
              <RotateCcw size={16} /> Reset
            </button>
          </div>
        )}
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 600, color: COLORS.brown, marginBottom: 12 }}>Rotation Order</h3>
      {orderedMembers.length === 0 ? (
        <p style={{ color: COLORS.textMuted, textAlign: 'center', padding: 20 }}>No rotation order set.</p>
      ) : (
        orderedMembers.map((m, i) => (
          <div key={m.id} style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: 12,
            background: m.id === currentId ? COLORS.gold + '12' : '#fff',
            borderRadius: 14, marginBottom: 8, border: `1px solid ${m.id === currentId ? COLORS.gold : COLORS.border}`
          }}>
            <span style={{
              width: 28, height: 28, borderRadius: '50%', background: m.id === currentId ? COLORS.gold : COLORS.creamDark,
              color: m.id === currentId ? '#fff' : COLORS.textLight, fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {i + 1}
            </span>
            <div style={{
              width: 36, height: 36, borderRadius: '50%', background: getAvatarColor(m.id),
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 12
            }}>
              {m.photo ? <img src={m.photo} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(m.name)}
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.brown, flex: 1 }}>{m.name}</span>
            {m.id === currentId && <Crown size={16} color={COLORS.gold} />}
          </div>
        ))
      )}
    </div>
  )
}
