import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { COLORS, FONTS, formatDate, getAvatarColor, getInitials } from '../lib/styles.js'
import { UserCheck, UserX, Crown, Trash2, Shield, Edit3 } from 'lucide-react'

export default function MembersScreen({ user, profile }) {
  const [members, setMembers] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const isChair = profile?.role === 'chair'

  useEffect(() => {
    if (!user) return
    loadMembers()
    const sub = supabase.channel('members-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, loadMembers)
      .subscribe()
    return () => sub.unsubscribe()
  }, [user])

  async function loadMembers() {
    setLoading(true)
    const { data } = await supabase.from('members').select('*').order('join_date', { ascending: false })
    setMembers(data || [])
    setLoading(false)
  }

  async function handleApprove(id) {
    const { error } = await supabase.from('members').update({ status: 'active' }).eq('id', id)
    if (error) alert(error.message)
    else loadMembers()
  }

  async function handleReject(id) {
    const { error } = await supabase.from('members').update({ status: 'rejected' }).eq('id', id)
    if (error) alert(error.message)
    else loadMembers()
  }

  async function handleRemove(id) {
    if (!confirm('Permanently remove this member?')) return
    const { error } = await supabase.from('members').delete().eq('id', id)
    if (error) alert(error.message)
    else loadMembers()
  }

  async function handleRoleChange(id, newRole) {
    const { error } = await supabase.from('members').update({ role: newRole }).eq('id', id)
    if (error) alert(error.message)
    else loadMembers()
  }

  const filtered = members.filter(m => filter === 'all' ? true : m.status === filter)
  const roleIcons = { chair: Crown, treasurer: Shield, secretary: Edit3, member: UserCheck }

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto' }}>
        {['all', 'active', 'pending', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '8px 16px', borderRadius: 20, border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: filter === f ? COLORS.brown : COLORS.creamDark,
            color: filter === f ? '#fff' : COLORS.textLight,
            textTransform: 'capitalize', whiteSpace: 'nowrap'
          }}>
            {f} ({f === 'all' ? members.length : members.filter(m => m.status === f).length})
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1,2,3,4].map(i => <div key={i} style={{ height: 72, background: COLORS.creamDark, borderRadius: 14 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ textAlign: 'center', color: COLORS.textMuted, padding: 40 }}>No members found.</p>
      ) : (
        filtered.map(m => {
          const RoleIcon = roleIcons[m.role] || UserCheck
          return (
            <div key={m.id} style={{
              background: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
              border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 12
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: '50%', background: getAvatarColor(m.id),
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0
              }}>
                {m.photo ? <img src={m.photo} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : getInitials(m.name)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, color: COLORS.brown }}>{m.name}</p>
                  <span style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: COLORS.creamDark, color: COLORS.textLight, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <RoleIcon size={10} /> {m.role}
                  </span>
                </div>
                <p style={{ fontSize: 12, color: COLORS.textLight }}>{m.phone}</p>
                <p style={{ fontSize: 11, color: COLORS.textMuted }}>Joined {formatDate(m.join_date)}</p>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '4px 10px', borderRadius: 12,
                  background: m.status === 'active' ? '#D1FAE5' : m.status === 'pending' ? '#FEF3C7' : '#FEE2E2',
                  color: m.status === 'active' ? '#065F46' : m.status === 'pending' ? '#B45309' : '#991B1B',
                  textTransform: 'capitalize'
                }}>
                  {m.status}
                </span>
              </div>
              {isChair && m.id !== user.id && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginLeft: 4 }}>
                  {m.status === 'pending' && (
                    <>
                      <button onClick={() => handleApprove(m.id)} style={smallActionBtn(COLORS.green)} title="Approve">
                        <UserCheck size={14} />
                      </button>
                      <button onClick={() => handleReject(m.id)} style={smallActionBtn(COLORS.red)} title="Reject">
                        <UserX size={14} />
                      </button>
                    </>
                  )}
                  {m.status === 'active' && (
                    <>
                      <select
                        value={m.role}
                        onChange={e => handleRoleChange(m.id, e.target.value)}
                        style={{ fontSize: 10, padding: '4px 6px', borderRadius: 6, border: `1px solid ${COLORS.border}`, background: '#fff', color: COLORS.brown, cursor: 'pointer' }}
                      >
                        <option value="member">Member</option>
                        <option value="treasurer">Treasurer</option>
                        <option value="secretary">Secretary</option>
                      </select>
                      <button onClick={() => handleRemove(m.id)} style={smallActionBtn(COLORS.red)} title="Remove">
                        <Trash2 size={14} />
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}

function smallActionBtn(color) {
  return {
    width: 28, height: 28, borderRadius: 8, border: 'none', background: color + '15',
    color: color, display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer'
  }
}
