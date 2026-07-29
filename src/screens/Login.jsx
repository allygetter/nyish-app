import React, { useState, useRef } from 'react'
import { supabase, getMemberProfile, uploadPhoto } from '../lib/supabase.js'
import { COLORS, FONTS } from '../lib/styles.js'
import {
  Mail, Lock, User, Phone, CreditCard, FileText, Camera,
  Eye, EyeOff, Shield, AlertCircle
} from 'lucide-react'

export default function LoginScreen({ navigateTo, setProfile, setUser }) {
  const [mode, setMode] = useState('login') // login | register | onboarding
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registeredUser, setRegisteredUser] = useState(null)

  const [reg, setReg] = useState({
    name: '', phone: '', id_number: '', kra_pin: '',
    photo: null, next_of_kin: '', next_of_kin_phone: ''
  })
  const [photoPreview, setPhotoPreview] = useState(null)
  const fileRef = useRef()

  // ─── HELPERS ───
  function showError(msg) {
    setError(msg)
    console.error('[NYISH]', msg)
  }

  // ─── LOGIN ───
  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: qErr } = await supabase
      .from('members')
      .select('*')
      .eq('email', email)
      .eq('password', password)
      .single()

    if (qErr || !data) {
      showError(qErr?.message || 'Invalid email or password.')
      setLoading(false)
      return
    }

    localStorage.setItem('nyish_user_id', data.id)
    setUser({ id: data.id, email: data.email })
    setProfile(data)
    navigateTo('dashboard', true)
    setLoading(false)
  }

  // ─── REGISTER ───
  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (password.length < 4) {
      showError('Password must be at least 4 characters.')
      setLoading(false)
      return
    }

    // Check if this is the first member ever
    const { count, error: countErr } = await supabase
      .from('members')
      .select('*', { count: 'exact', head: true })

    if (countErr) {
      showError('Could not check existing members: ' + countErr.message)
      setLoading(false)
      return
    }

    const isFirst = count === 0
    const userId = crypto.randomUUID()

    const { error: insertErr } = await supabase.from('members').insert({
      id: userId,
      name: reg.name,
      phone: reg.phone,
      id_number: reg.id_number,
      kra_pin: reg.kra_pin,
      email: email,
      password: password,
      role: isFirst ? 'chair' : 'member',
      status: isFirst ? 'active' : 'pending',
      onboarding_completed: false,
    })

    if (insertErr) {
      showError('Registration failed: ' + insertErr.message)
      setLoading(false)
      return
    }

    const profile = await getMemberProfile(userId)
    setRegisteredUser(profile)
    setMode('onboarding')
    setLoading(false)
  }

  // ─── ONBOARDING ───
  async function handleOnboardingSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    let photoUrl = null
    if (reg.photo) {
      try {
        photoUrl = await uploadPhoto(reg.photo, registeredUser.id)
      } catch (e) {
        console.error('Photo upload failed', e)
      }
    }

    const { error: updErr } = await supabase
      .from('members')
      .update({
        next_of_kin: reg.next_of_kin || null,
        next_of_kin_phone: reg.next_of_kin_phone || null,
        photo: photoUrl,
        onboarding_completed: true,
      })
      .eq('id', registeredUser.id)

    if (updErr) {
      showError('Failed to save profile: ' + updErr.message)
      setLoading(false)
      return
    }

    const profile = await getMemberProfile(registeredUser.id)
    localStorage.setItem('nyish_user_id', profile.id)
    setUser({ id: profile.id, email: profile.email })
    setProfile(profile)
    navigateTo('dashboard', true)
    setLoading(false)
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxW = 400
        const scale = Math.min(maxW / img.width, 1)
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob((blob) => {
          const resized = new File([blob], file.name, { type: 'image/jpeg' })
          setReg(r => ({ ...r, photo: resized }))
          setPhotoPreview(canvas.toDataURL('image/jpeg'))
        }, 'image/jpeg', 0.8)
      }
      img.src = ev.target.result
    }
    reader.readAsDataURL(file)
  }

  // ─── RENDER: ERROR BOX ───
  const ErrorBox = () => error ? (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12, padding: 10, background: '#FEE2E2', borderRadius: 10 }}>
      <AlertCircle size={16} color="#991B1B" style={{ marginTop: 2, flexShrink: 0 }} />
      <p style={{ color: '#991B1B', fontSize: 13, wordBreak: 'break-word', lineHeight: 1.4 }}>{error}</p>
    </div>
  ) : null

  // ═══════════════════════════════════════════════════════
  // LOGIN SCREEN
  // ═══════════════════════════════════════════════════════
  if (mode === 'login') {
    return (
      <div style={loginContainer}>
        <div style={sealStyle}>
          <Shield size={40} color={COLORS.gold} />
        </div>
        <h1 style={{ fontFamily: FONTS.display, fontSize: 28, color: COLORS.brown, marginBottom: 4 }}>NYISH</h1>
        <p style={{ color: COLORS.textLight, fontSize: 14, marginBottom: 32 }}>Your community savings group</p>

        <form onSubmit={handleLogin} style={{ width: '100%', maxWidth: 320 }}>
          <div style={inputGroup}>
            <Mail size={18} color={COLORS.textMuted} />
            <input
              type="email" placeholder="Email address" required
              value={email} onChange={e => setEmail(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div style={inputGroup}>
            <Lock size={18} color={COLORS.textMuted} />
            <input
              type={showPassword ? 'text' : 'password'} placeholder="Password" required
              value={password} onChange={e => setPassword(e.target.value)}
              style={inputStyle}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
              {showPassword ? <EyeOff size={18} color={COLORS.textMuted} /> : <Eye size={18} color={COLORS.textMuted} />}
            </button>
          </div>
          <ErrorBox />
          <button type="submit" disabled={loading} style={primaryBtn}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <button onClick={() => { setMode('register'); setError('') }} style={linkBtn}>
          New member? <span style={{ color: COLORS.gold, fontWeight: 600 }}>Register</span>
        </button>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════
  // REGISTER SCREEN
  // ═══════════════════════════════════════════════════════
  if (mode === 'register') {
    return (
      <div style={loginContainer}>
        <h2 style={{ fontFamily: FONTS.display, fontSize: 22, color: COLORS.brown, marginBottom: 24 }}>Join NYISH</h2>
        <form onSubmit={handleRegister} style={{ width: '100%', maxWidth: 320 }}>
          <div style={inputGroup}>
            <User size={18} color={COLORS.textMuted} />
            <input placeholder="Full name" required value={reg.name} onChange={e => setReg(r => ({ ...r, name: e.target.value }))} style={inputStyle} />
          </div>
          <div style={inputGroup}>
            <Phone size={18} color={COLORS.textMuted} />
            <input placeholder="Phone number" required value={reg.phone} onChange={e => setReg(r => ({ ...r, phone: e.target.value }))} style={inputStyle} />
          </div>
          <div style={inputGroup}>
            <CreditCard size={18} color={COLORS.textMuted} />
            <input placeholder="National ID Number" required value={reg.id_number} onChange={e => setReg(r => ({ ...r, id_number: e.target.value }))} style={inputStyle} />
          </div>
          <div style={inputGroup}>
            <FileText size={18} color={COLORS.textMuted} />
            <input placeholder="KRA PIN" required value={reg.kra_pin} onChange={e => setReg(r => ({ ...r, kra_pin: e.target.value }))} style={inputStyle} />
          </div>
          <div style={inputGroup}>
            <Mail size={18} color={COLORS.textMuted} />
            <input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
          </div>
          <div style={inputGroup}>
            <Lock size={18} color={COLORS.textMuted} />
            <input type="password" placeholder="Create password (min 4 chars)" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
          </div>
          <ErrorBox />
          <button type="submit" disabled={loading} style={primaryBtn}>
            {loading ? 'Registering...' : 'Create Account'}
          </button>
        </form>
        <button onClick={() => setMode('login')} style={linkBtn}>Already have an account? Sign in</button>
      </div>
    )
  }

  // ═══════════════════════════════════════════════════════
  // ONBOARDING SCREEN
  // ═══════════════════════════════════════════════════════
  if (mode === 'onboarding') {
    const isChair = registeredUser?.role === 'chair'
    return (
      <div style={loginContainer}>
        <h2 style={{ fontFamily: FONTS.display, fontSize: 22, color: COLORS.brown, marginBottom: 8 }}>
          {isChair ? 'Welcome, Chairperson!' : 'Complete Profile'}
        </h2>
        <p style={{ color: COLORS.textLight, fontSize: 14, marginBottom: 24, textAlign: 'center' }}>
          {isChair
            ? 'You are the first member — you have been assigned as Chairperson.'
            : 'Your registration is pending Chairperson approval.'}
        </p>
        <form onSubmit={handleOnboardingSubmit} style={{ width: '100%', maxWidth: 320 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
            <div onClick={() => fileRef.current?.click()} style={{
              width: 100, height: 100, borderRadius: '50%', border: `2px dashed ${COLORS.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', cursor: 'pointer', background: COLORS.creamDark
            }}>
              {photoPreview ? (
                <img src={photoPreview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <Camera size={28} color={COLORS.textMuted} />
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
            <span style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 8 }}>Tap to add photo (optional)</span>
          </div>

          <div style={inputGroup}>
            <User size={18} color={COLORS.textMuted} />
            <input placeholder="Next of Kin name" value={reg.next_of_kin || ''} onChange={e => setReg(r => ({ ...r, next_of_kin: e.target.value }))} style={inputStyle} />
          </div>
          <div style={inputGroup}>
            <Phone size={18} color={COLORS.textMuted} />
            <input placeholder="Next of Kin phone" value={reg.next_of_kin_phone || ''} onChange={e => setReg(r => ({ ...r, next_of_kin_phone: e.target.value }))} style={inputStyle} />
          </div>

          <ErrorBox />
          <button type="submit" disabled={loading} style={primaryBtn}>
            {loading ? 'Saving...' : isChair ? 'Enter Dashboard' : 'Complete Registration'}
          </button>
        </form>
      </div>
    )
  }
}

const loginContainer = {
  minHeight: '100%', display: 'flex', flexDirection: 'column',
  alignItems: 'center', justifyContent: 'center', padding: 24,
  background: COLORS.cream
}
const sealStyle = {
  width: 80, height: 80, borderRadius: '50%',
  border: `3px solid ${COLORS.gold}`,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  marginBottom: 16, background: '#fff'
}
const inputGroup = {
  display: 'flex', alignItems: 'center', gap: 10,
  background: '#fff', border: `1px solid ${COLORS.border}`,
  borderRadius: 12, padding: '10px 14px', marginBottom: 12
}
const inputStyle = {
  flex: 1, border: 'none', outline: 'none', fontSize: 15,
  color: COLORS.brown, background: 'transparent'
}
const primaryBtn = {
  width: '100%', padding: '14px', borderRadius: 12, border: 'none',
  background: COLORS.brown, color: '#fff', fontSize: 15, fontWeight: 600,
  cursor: 'pointer', marginTop: 8
}
const linkBtn = {
  background: 'none', border: 'none', color: COLORS.textLight,
  fontSize: 14, marginTop: 20, cursor: 'pointer'
}
