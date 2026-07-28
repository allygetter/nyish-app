import React, { useState, useRef } from 'react'
import { supabase, getMemberProfile } from '../lib/supabase.js'
import { COLORS, FONTS } from '../lib/styles.js'
import { Mail, Lock, User, Phone, CreditCard, FileText, Camera, ChevronRight, Eye, EyeOff, Shield } from 'lucide-react'

export default function LoginScreen({ navigateTo, setProfile }) {
  const [mode, setMode] = useState('login') // login | register | onboarding | otp
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [registeredUser, setRegisteredUser] = useState(null)

  // Registration fields
  const [reg, setReg] = useState({ name: '', phone: '', id_number: '', kra_pin: '', photo: null })
  const [photoPreview, setPhotoPreview] = useState(null)
  const fileRef = useRef()
  const otpRefs = useRef([])

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (signInError) {
      setError(signInError.message)
      return
    }
    const profile = await getMemberProfile(data.user.id)
    setProfile(profile)
    if (!profile.onboarding_completed) {
      setMode('onboarding')
      setRegisteredUser(data.user)
    } else {
      navigateTo('dashboard', true)
    }
  }

  async function handleRegister(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: reg.name,
          phone: reg.phone,
          id_number: reg.id_number,
          kra_pin: reg.kra_pin,
        }
      }
    })
    setLoading(false)
    if (signUpError) {
      // Detect if email confirmation is required
      if (signUpError.message.toLowerCase().includes('confirmation') || signUpError.message.toLowerCase().includes('verify')) {
        setMode('otp')
        setRegisteredUser(data?.user)
        return
      }
      setError(signUpError.message)
      return
    }
    // No confirmation required (dev mode)
    if (data?.user) {
      setRegisteredUser(data.user)
      setMode('onboarding')
    }
  }

  async function handleOtpSubmit() {
    const code = otp.join('')
    setLoading(true)
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'signup'
    })
    setLoading(false)
    if (verifyError) {
      setError(verifyError.message)
      return
    }
    if (data?.user) {
      setRegisteredUser(data.user)
      setMode('onboarding')
    }
  }

  async function handleOnboardingSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    let photoUrl = null
    if (reg.photo) {
      const { uploadPhoto } = await import('../lib/supabase.js')
      try {
        photoUrl = await uploadPhoto(reg.photo, registeredUser.id)
      } catch (e) {
        console.error('Photo upload failed', e)
      }
    }
    const { error: updError } = await supabase
      .from('members')
      .update({
        name: reg.name,
        phone: reg.phone,
        id_number: reg.id_number,
        kra_pin: reg.kra_pin,
        photo: photoUrl,
        onboarding_completed: true,
        next_of_kin: reg.next_of_kin || null,
        next_of_kin_phone: reg.next_of_kin_phone || null,
      })
      .eq('id', registeredUser.id)
    setLoading(false)
    if (updError) {
      setError(updError.message)
      return
    }
    const profile = await getMemberProfile(registeredUser.id)
    setProfile(profile)
    navigateTo('dashboard', true)
  }

  function handlePhotoChange(e) {
    const file = e.target.files[0]
    if (!file) return
    // Client-side resize
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

  function handleOtpChange(i, val) {
    if (!/^\\d?$/.test(val)) return
    const next = [...otp]
    next[i] = val
    setOtp(next)
    if (val && i < 5) otpRefs.current[i + 1]?.focus()
  }

  function handleOtpKey(i, e) {
    if (e.key === 'Backspace' && !otp[i] && i > 0) {
      otpRefs.current[i - 1]?.focus()
    }
  }

  // ─── LOGIN ───
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
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ background: 'none', border: 'none', padding: 0 }}>
              {showPassword ? <EyeOff size={18} color={COLORS.textMuted} /> : <Eye size={18} color={COLORS.textMuted} />}
            </button>
          </div>
          {error && <p style={{ color: COLORS.red, fontSize: 13, marginBottom: 12 }}>{error}</p>}
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

  // ─── REGISTER ───
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
            <input type="password" placeholder="Create password" required value={password} onChange={e => setPassword(e.target.value)} style={inputStyle} />
          </div>
          {error && <p style={{ color: COLORS.red, fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button type="submit" disabled={loading} style={primaryBtn}>
            {loading ? 'Registering...' : 'Create Account'}
          </button>
        </form>
        <button onClick={() => setMode('login')} style={linkBtn}>Already have an account? Sign in</button>
      </div>
    )
  }

  // ─── OTP ───
  if (mode === 'otp') {
    return (
      <div style={loginContainer}>
        <h2 style={{ fontFamily: FONTS.display, fontSize: 22, color: COLORS.brown, marginBottom: 8 }}>Verify Email</h2>
        <p style={{ color: COLORS.textLight, fontSize: 14, marginBottom: 24, textAlign: 'center' }}>
          Enter the 6-digit code sent to {email}
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {otp.map((d, i) => (
            <input
              key={i} ref={el => otpRefs.current[i] = el}
              value={d} onChange={e => handleOtpChange(i, e.target.value)}
              onKeyDown={e => handleOtpKey(i, e)}
              maxLength={1}
              style={{
                width: 44, height: 52, textAlign: 'center', fontSize: 20, fontWeight: 700,
                border: `2px solid ${d ? COLORS.gold : COLORS.border}`, borderRadius: 10,
                background: '#fff', color: COLORS.brown, outline: 'none'
              }}
            />
          ))}
        </div>
        {error && <p style={{ color: COLORS.red, fontSize: 13, marginBottom: 12 }}>{error}</p>}
        <button onClick={handleOtpSubmit} disabled={loading || otp.join('').length !== 6} style={primaryBtn}>
          {loading ? 'Verifying...' : 'Verify'}
        </button>
        <button onClick={() => setMode('register')} style={linkBtn}>Back to registration</button>
      </div>
    )
  }

  // ─── ONBOARDING ───
  if (mode === 'onboarding') {
    return (
      <div style={loginContainer}>
        <h2 style={{ fontFamily: FONTS.display, fontSize: 22, color: COLORS.brown, marginBottom: 8 }}>Complete Profile</h2>
        <p style={{ color: COLORS.textLight, fontSize: 14, marginBottom: 24, textAlign: 'center' }}>
          Your registration is pending Chairperson approval.
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

          {error && <p style={{ color: COLORS.red, fontSize: 13, marginBottom: 12 }}>{error}</p>}
          <button type="submit" disabled={loading} style={primaryBtn}>
            {loading ? 'Saving...' : 'Complete Registration'}
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
