import React from 'react'
import { COLORS, FONTS } from '../lib/styles.js'
import { FileText, Gift, Megaphone, ShieldAlert, Users } from 'lucide-react'

export default function MoreScreen({ navigateTo }) {
  const items = [
    { label: 'Announcements', icon: Megaphone, screen: 'announcements' },
    { label: 'Fines', icon: ShieldAlert, screen: 'fines' },
    { label: 'Members', icon: Users, screen: 'members' },
    { label: 'Merry-Go-Round', icon: Gift, screen: 'rotation' },
    { label: 'Constitution', icon: FileText, screen: 'constitution' },
  ]

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      <h2 style={{ fontFamily: FONTS.display, fontSize: 20, color: COLORS.brown, marginBottom: 20 }}>More</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(item => {
          const Icon = item.icon
          return (
            <button key={item.label} onClick={() => navigateTo(item.screen)} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: 16,
              background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 16,
              cursor: 'pointer', textAlign: 'left', width: '100%'
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: COLORS.creamDark, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} color={COLORS.brown} />
              </div>
              <span style={{ fontSize: 15, fontWeight: 500, color: COLORS.brown, flex: 1 }}>{item.label}</span>
              <span style={{ color: COLORS.textMuted, fontSize: 18 }}>›</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
