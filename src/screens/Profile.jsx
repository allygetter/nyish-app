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
