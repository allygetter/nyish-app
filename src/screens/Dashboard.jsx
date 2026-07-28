import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { COLORS, FONTS, formatCurrency, formatDate, getAvatarColor, getInitials } from '../lib/styles.js'
import {
  PiggyBank, Landmark, ShieldAlert, Megaphone, Users, ChevronRight,
  TrendingUp, Gift, FileText, QrCode
} from 'lucide-react'

export default function DashboardScreen({ user, profile, navigateTo, isOfficial }) {
  const [stats, setStats] = useState({ groupSavings: 0, mySavings: 0, loansOut: 0, unpaidFines: 0, unpaidFinesTotal: 0 })
  const [announcements, setAnnouncements] = useState([])
  const [rotation, setRotation] = useState(null)
  const [currentRecipient, setCurrentRecipient] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    loadDashboard()
    const channels = [
      supabase.channel('dash-savings').on('postgres_changes', { event: '*', schema: 'public', table: 'savings' }, loadDashboard).subscribe(),
      supabase.channel('dash-loans').on('postgres_changes', { event: '*', schema: 'public', table: 'loans' }, loadDashboard).subscribe(),
      supabase.channel('dash-fines').on('postgres_changes', { event: '*', schema: 'public', table: 'fines' }, loadDashboard).subscribe(),
      supabase.channel('dash-announce').on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, loadDashboard).subscribe(),
      supabase.channel('dash-members').on('postgres_changes', { event: '*', schema: 'public', table: 'members' }, loadDashboard).subscribe(),
    ]
    return () => channels.forEach(c => c.unsubscribe())
  }, [user])

  async function loadDashboard() {
    if (!user) return
    setLoading(true)
    const [savingsRes, mySavingsRes, loansRes, finesRes, annRes, rotRes] = await Promise.all([
      supabase.from('savings').select('amount'),
      supabase.from('savings').select('amount').eq('member_id', user.id),
      supabase.from('loans').select('balance').in('status', ['approved']),
      supabase.from('fines').select('amount, status').eq('member_id', user.id).eq('status', 'unpaid'),
      supabase.from('announcements').select('*, members(name)').order('date', { ascending: false }).limit(2),
      supabase.from('nyish_store').select('value').eq('key', 'rotation').single(),
    ])

    const groupSavings = (savingsRes.data || []).reduce((s, r) => s + (r.amount || 0), 0)
    const mySavings = (mySavingsRes.data || []).reduce((s, r) => s + (r.amount || 0), 0)
    const loansOut = (loansRes.data || []).reduce((s, r) => s + (r.balance || 0), 0)
    const unpaidFines = (finesRes.data || []).length
    const unpaidFinesTotal = (finesRes.data || []).reduce((s, r) => s + (r.amount || 0), 0)

    setStats({ groupSavings, mySavings, loansOut, unpaidFines, unpaidFinesTotal })
    setAnnouncements(annRes.data || [])

    if (rotRes.data?.value?.order?.length > 0) {
      const idx = rotRes.data.value.current_index || 0
      const recipientId = rotRes.data.value.order[idx]
      setRotation(rotRes.data.value)
      const { data: rec } = await supabase.from('members').select('name, photo, id').eq('id', recipientId).single()
      setCurrentRecipient(rec)
    }
    setLoading(false)
  }

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const quickActions = [
    { label: 'Savings', icon: PiggyBank, screen: 'savings', color: COLORS.green },
    { label: 'Loans', icon: Landmark, screen: 'loans', color: COLORS.blue },
    { label: 'Meetings', icon: Users, screen: 'meetings', color: COLORS.brownLight },
    { label: 'Members', icon: Users, screen: 'members', color: COLORS.gold },
  ]

  if (loading) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ height: 80, background: COLORS.creamDark, borderRadius: 16, animation: 'pulse 1.5s infinite' }} />
        ))}
        <style>{`@keyframes pulse { 0%,100% { opacity: 0.6 } 50% { opacity: 1 } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      {/* Greeting */}
      <div style={{ marginBottom: 20 }}>
        <p style={{ fontSize: 14, color: COLORS.textLight, marginBottom: 2 }}>{greeting()},</p>
        <h2 style={{ fontFamily: FONTS.display, fontSize: 22, color: COLORS.brown, fontWeight: 600 }}>
          {profile?.name?.split(' ')[0] || 'Member'}
          <span style={{ fontSize: 12, color: COLORS.gold, marginLeft: 8, fontFamily: FONTS.body, fontWeight: 500, textTransform: 'capitalize' }}>
            {profile?.role}
          </span>
        </h2>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        <StatCard icon={PiggyBank} label="Group Savings" value={formatCurrency(stats.groupSavings)} color={COLORS.green} />
        <StatCard icon={TrendingUp} label="My Savings" value={formatCurrency(stats.mySavings)} color={COLORS.brown} />
        <StatCard icon={Landmark} label="Loans Out" value={formatCurrency(stats.loansOut)} color={COLORS.blue} />
        <StatCard icon={ShieldAlert} label="Unpaid Fines" value={`${stats.unpaidFines} · ${formatCurrency(stats.unpaidFinesTotal)}`} color={COLORS.red} />
      </div>

      {/* Merry-go-round */}
      {currentRecipient && (
        <div style={{
          background: 'linear-gradient(135deg, #F5F0E8 0%, #FFFDF8 100%)',
          borderRadius: 16, padding: 16, marginBottom: 20,
          border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', gap: 14
        }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%', background: getAvatarColor(currentRecipient.id),
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16
          }}>
            {currentRecipient.photo ? (
              <img src={currentRecipient.photo} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : getInitials(currentRecipient.name)}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 12, color: COLORS.gold, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Merry-Go-Round Recipient</p>
            <p style={{ fontFamily: FONTS.display, fontSize: 16, color: COLORS.brown, fontWeight: 600 }}>{currentRecipient.name}</p>
          </div>
          <Gift size={24} color={COLORS.gold} />
        </div>
      )}

      {/* Quick Actions */}
      <h3 style={{ fontSize: 14, fontWeight: 600, color: COLORS.brown, marginBottom: 12 }}>Quick Actions</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
        {quickActions.map(a => (
          <button key={a.label} onClick={() => navigateTo(a.screen)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: 14,
            background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 14,
            cursor: 'pointer', textAlign: 'left'
          }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: a.color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <a.icon size={18} color={a.color} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 500, color: COLORS.brown }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Announcements */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, color: COLORS.brown }}>Announcements</h3>
        <button onClick={() => navigateTo('announcements')} style={{ fontSize: 12, color: COLORS.gold, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
          View all
        </button>
      </div>
      {announcements.length === 0 && (
        <p style={{ color: COLORS.textMuted, fontSize: 13, padding: 16, textAlign: 'center' }}>No announcements yet.</p>
      )}
      {announcements.map(a => (
        <div key={a.id} style={{
          background: '#fff', borderRadius: 14, padding: 14, marginBottom: 10,
          border: `1px solid ${COLORS.border}`, cursor: 'pointer'
        }} onClick={() => navigateTo('announcements')}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: COLORS.gold + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Megaphone size={18} color={COLORS.gold} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: COLORS.brown, marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.title}</p>
              <p style={{ fontSize: 13, color: COLORS.textLight, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.body}</p>
              <p style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 6 }}>{formatDate(a.date)} · {a.members?.name}</p>
            </div>
          </div>
        </div>
      ))}

      {/* Pending approval notice */}
      {profile?.status === 'pending' && (
        <div style={{
          background: '#FEF3C7', borderRadius: 14, padding: 16, marginTop: 20,
          border: '1px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 12
        }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F59E0B20', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldAlert size={20} color="#B45309" />
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: 14, color: '#92400E' }}>Approval Pending</p>
            <p style={{ fontSize: 13, color: '#B45309' }}>Your membership is awaiting Chairperson approval.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 16, padding: 16,
      border: `1px solid ${COLORS.border}`, display: 'flex', flexDirection: 'column', gap: 8
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: color + '12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{ fontSize: 12, color: COLORS.textLight, fontWeight: 500 }}>{label}</span>
      </div>
      <p style={{ fontFamily: FONTS.display, fontSize: 18, color: COLORS.brown, fontWeight: 700 }}>{value}</p>
    </div>
  )
}
