import React, { useState, useEffect, useRef } from 'react'
import { supabase, getMemberProfile, uploadPhoto } from '../lib/supabase.js'
import { COLORS, FONTS, formatDate, getAvatarColor, getInitials, generateQRData } from '../lib/styles.js'
import { QrCode, Award, Camera, Download, LogOut, X } from 'lucide-react'
import QRCode from 'qrcode'

export default function ProfileScreen({ user, profile, setProfile, navigateTo, handleLogout }) {
  const [showQR, setShowQR] = useState(false)
  const [showCert, setShowCert] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})
  const fileRef = useRef()

  useEffect(() => {
    if (profile) {
      setForm({ ...profile })
      generateQR(profile)
    }
  }, [profile])

  async function generateQR(p) {
    if (!p) return
    const data = generateQRData(p)
    try {
      const url = await QRCode.toDataURL(data, { width: 300, margin: 2, color: { dark: COLORS.brown, light: '#FFFDF8' } })
      setQrDataUrl(url)
    } catch (e) { console.error(e) }
  }

  async function handleSave() {
    const { error } = await supabase.from('members').update({
      name: form.name,
      phone: form.phone,
      next_of_kin: form.next_of_kin,
      next_of_kin_phone: form.next_of_kin_phone,
    }).eq('id', user.id)
    if (error) alert(error.message)
    else {
      const p = await getMemberProfile(user.id)
      setProfile(p)
      setEditing(false)
    }
  }

  async function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    try {
      const url = await uploadPhoto(file, user.id)
      await supabase.from('members').update({ photo: url }).eq('id', user.id)
      const p = await getMemberProfile(user.id)
      setProfile(p)
    } catch (e) { alert('Upload failed') }
  }

  if (!profile) return null

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 24, border: `1px solid ${COLORS.border}`, textAlign: 'center', marginBottom: 20 }}>
        <div onClick={() => fileRef.current?.click()} style={{
          width: 90, height: 90, borderRadius: '50%', margin: '0 auto 16px',
          background: getAvatarColor(profile.id), display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 28, fontWeight: 700, cursor: 'pointer', position: 'relative', overflow: 'hidden'
        }}>
          {profile.photo ? <img src={profile.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(profile.name)}
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s' }}
               onMouseEnter={e => e.currentTarget.style.opacity = 1}
               onMouseLeave={e => e.currentTarget.style.opacity = 0}>
            <Camera size={24} color="#fff" />
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
        <h2 style={{ fontFamily: FONTS.display, fontSize: 22, color: COLORS.brown, marginBottom: 4 }}>{profile.name}</h2>
        <p style={{ fontSize: 14, color: COLORS.textLight, textTransform: 'capitalize', marginBottom: 8 }}>{profile.role} &middot; {profile.status}</p>
        <p style={{ fontSize: 12, color: COLORS.textMuted }}>Member since {formatDate(profile.join_date)}</p>
      </div>

      <div style={{ background: '#fff', borderRadius: 16, padding: 16, border: `1px solid ${COLORS.border}`, marginBottom: 20 }}>
        {editing ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: COLORS.textMuted }}>Name</label>
              <input value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: COLORS.textMuted }}>Phone</label>
              <input value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: COLORS.textMuted }}>Next of Kin</label>
              <input value={form.next_of_kin || ''} onChange={e => setForm(f => ({ ...f, next_of_kin: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: COLORS.textMuted }}>Next of Kin Phone</label>
              <input value={form.next_of_kin_phone || ''} onChange={e => setForm(f => ({ ...f, next_of_kin_phone: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setEditing(false)} style={{ flex: 1, padding: 12, borderRadius: 12, border: `1px solid ${COLORS.border}`, background: '#fff', color: COLORS.brown, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSave} style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: COLORS.brown, color: '#fff', cursor: 'pointer' }}>Save</button>
            </div>
          </div>
        ) : (
          <div>
            {[
              { label: 'Email', value: profile.email },
              { label: 'Phone', value: profile.phone },
              { label: 'National ID', value: profile.id_number },
              { label: 'KRA PIN', value: profile.kra_pin },
              { label: 'Next of Kin', value: profile.next_of_kin ? `${profile.next_of_kin} (${profile.next_of_kin_phone})` : '—' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                <span style={{ fontSize: 13, color: COLORS.textLight }}>{item.label}</span>
                <span style={{ fontSize: 13, color: COLORS.brown, fontWeight: 500 }}>{item.value}</span>
              </div>
            ))}
            <button onClick={() => setEditing(true)} style={{ width: '100%', marginTop: 12, padding: 12, borderRadius: 12, border: `1px solid ${COLORS.border}`, background: '#fff', color: COLORS.brown, fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
              Edit Profile
            </button>
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        <button onClick={() => setShowQR(true)} style={actionCard}>
          <QrCode size={20} color={COLORS.brown} />
          <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.brown }}>QR Card</span>
        </button>
        <button onClick={() => setShowCert(true)} style={actionCard}>
          <Award size={20} color={COLORS.gold} />
          <span style={{ fontSize: 13, fontWeight: 500, color: COLORS.brown }}>Certificate</span>
        </button>
      </div>

      <button onClick={handleLogout} style={{
        width: '100%', padding: 14, borderRadius: 14, border: `1px solid ${COLORS.red}`,
        background: '#fff', color: COLORS.red, fontSize: 15, fontWeight: 600,
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
      }}>
        <LogOut size={18} /> Sign Out
      </button>

      {showQR && (
        <div style={modalOverlay} onClick={() => setShowQR(false)}>
          <div style={{ ...modalContent, textAlign: 'center', padding: 32 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontFamily: FONTS.display, fontSize: 20, color: COLORS.brown, marginBottom: 16 }}>Member QR Card</h3>
            {qrDataUrl && <img src={qrDataUrl} style={{ width: 220, height: 220, margin: '0 auto 20px', borderRadius: 16, border: `4px solid ${COLORS.gold}` }} />}
            <p style={{ fontSize: 14, color: COLORS.textLight, marginBottom: 20 }}>Scan to verify membership</p>
            <button onClick={() => setShowQR(false)} style={{ ...primaryBtn, width: '100%' }}>Close</button>
          </div>
        </div>
      )}

      {showCert && (
        <div style={modalOverlay} onClick={() => setShowCert(false)}>
          <div style={{ ...modalContent, padding: 32, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
            <div style={{ border: `3px solid ${COLORS.gold}`, borderRadius: 16, padding: 32, background: '#fff' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', border: `3px solid ${COLORS.gold}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Award size={28} color={COLORS.gold} />
              </div>
              <h2 style={{ fontFamily: FONTS.display, fontSize: 24, color: COLORS.brown, marginBottom: 8 }}>Certificate of Membership</h2>
              <p style={{ fontSize: 14, color: COLORS.textLight, marginBottom: 20 }}>This certifies that</p>
              <h3 style={{ fontFamily: FONTS.display, fontSize: 20, color: COLORS.brown, marginBottom: 8 }}>{profile.name}</h3>
              <p style={{ fontSize: 13, color: COLORS.textLight, marginBottom: 20 }}>
                is a registered member of <strong>NYISH Chama</strong><br />
                since {formatDate(profile.join_date)}.
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 40, marginTop: 24 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 80, height: 1, background: COLORS.brown, margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 11, color: COLORS.textMuted }}>Chairperson</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ width: 80, height: 1, background: COLORS.brown, margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 11, color: COLORS.textMuted }}>Date</p>
                </div>
              </div>
            </div>
            <button onClick={() => window.print()} style={{ marginTop: 16, ...primaryBtn, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Download size={16} /> Print / Save PDF
            </button>
            <button onClick={() => setShowCert(false)} style={{ marginTop: 10, width: '100%', padding: 12, borderRadius: 12, border: 'none', background: 'none', color: COLORS.textLight, cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const inputStyle = {
  width: '100%', padding: '10px 12px', borderRadius: 10, border: `1px solid ${COLORS.border}`,
  fontSize: 14, color: COLORS.brown, background: '#fff', outline: 'none', marginTop: 4
}
const actionCard = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: 20,
  background: '#fff', border: `1px solid ${COLORS.border}`, borderRadius: 14, cursor: 'pointer'
}
const modalOverlay = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100,
  display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
}
const modalContent = {
  background: COLORS.cream, width: '100%', maxWidth: 480, borderRadius: '24px 24px 0 0',
  padding: 24, maxHeight: '85vh', overflowY: 'auto'
}
const primaryBtn = {
  padding: '14px', borderRadius: 12, border: 'none',
  background: COLORS.brown, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer'
}
