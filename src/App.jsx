import React, { useState, useEffect } from 'react'
import { supabase, getMemberProfile } from './lib/supabase.js'
import { setupOnlineListener, flushQueue, isOnline } from './lib/offlineQueue.js'
import { COLORS, FONTS } from './lib/styles.js'
import {
  Home, Users, PiggyBank, Landmark, Calendar, Menu, ChevronLeft,
  WifiOff, User
} from 'lucide-react'

import LoginScreen from './screens/Login.jsx'
import DashboardScreen from './screens/Dashboard.jsx'
import SavingsScreen from './screens/Savings.jsx'
import LoansScreen from './screens/Loans.jsx'
import MeetingsScreen from './screens/Meetings.jsx'
import AnnouncementsScreen from './screens/Announcements.jsx'
import FinesScreen from './screens/Fines.jsx'
import MembersScreen from './screens/Members.jsx'
import ProfileScreen from './screens/Profile.jsx'
import ConstitutionScreen from './screens/Constitution.jsx'
import RotationScreen from './screens/Rotation.jsx'
import MoreScreen from './screens/More.jsx'

const SCREENS = {
  login: LoginScreen, dashboard: DashboardScreen, savings: SavingsScreen,
  loans: LoansScreen, meetings: MeetingsScreen, announcements: AnnouncementsScreen,
  fines: FinesScreen, members: MembersScreen, profile: ProfileScreen,
  constitution: ConstitutionScreen, rotation: RotationScreen, more: MoreScreen,
}

const TAB_SCREENS = ['dashboard', 'savings', 'loans', 'meetings', 'more']
const TAB_ICONS = {
  dashboard: Home, savings: PiggyBank, loans: Landmark,
  meetings: Calendar, more: Menu,
}
const TAB_LABELS = {
  dashboard: 'Home', savings: 'Savings', loans: 'Loans',
  meetings: 'Meetings', more: 'More',
}

export default function App() {
  const [screen, setScreen] = useState('login')
  const [screenHistory, setScreenHistory] = useState(['login'])
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [online, setOnline] = useState(isOnline())
  const [queueCount, setQueueCount] = useState(0)

  useEffect(() => {
    let mounted = true
    async function init() {
      const storedId = localStorage.getItem('nyish_user_id')
      if (storedId) {
        const p = await getMemberProfile(storedId)
        if (!mounted) return
        if (p) {
          setUser({ id: storedId, email: p.email })
          setProfile(p)
          navigateTo('dashboard', true)
        } else {
          localStorage.removeItem('nyish_user_id')
        }
      }
      setLoading(false)
    }
    init()

    setupOnlineListener(supabase)
    const onOnline = () => { setOnline(true); flushQueue(supabase) }
    const onOffline = () => setOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    const onQueue = () => updateQueueCount()
    window.addEventListener('nyish:queueChanged', onQueue)

    return () => {
      mounted = false
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('nyish:queueChanged', onQueue)
    }
  }, [])

  async function updateQueueCount() {
    const { getQueue } = await import('./lib/offlineQueue.js')
    const items = await getQueue()
    setQueueCount(items.length)
  }

  function navigateTo(name, reset = false) {
    if (reset) {
      setScreenHistory([name])
    } else {
      setScreenHistory(prev => [...prev, name])
    }
    setScreen(name)
    window.scrollTo(0, 0)
  }

  function goBack() {
    setScreenHistory(prev => {
      if (prev.length <= 1) return prev
      const next = prev.slice(0, -1)
      setScreen(next[next.length - 1])
      return next
    })
  }

  function handleLogout() {
    localStorage.removeItem('nyish_user_id')
    setUser(null)
    setProfile(null)
    navigateTo('login', true)
  }

  const ScreenComponent = SCREENS[screen] || DashboardScreen
  const showBack = screenHistory.length > 1 && screen !== 'login'
  const showNav = user && profile && TAB_SCREENS.includes(screen)
  const isOfficial = profile && ['chair', 'treasurer', 'secretary'].includes(profile.role)

  if (loading) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: COLORS.cream, flexDirection: 'column', gap: 16
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: '50%',
          border: `3px solid ${COLORS.border}`,
          borderTopColor: COLORS.gold,
          animation: 'spin 1s linear infinite'
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontFamily: FONTS.display, color: COLORS.brown, fontSize: 16 }}>NYISH</p>
      </div>
    )
  }

  return (
    <div style={{
      height: '100vh', display: 'flex', flexDirection: 'column',
      background: COLORS.cream, maxWidth: 480, margin: '0 auto',
      position: 'relative', boxShadow: '0 0 40px rgba(0,0,0,0.08)'
    }}>
      {user && profile && screen !== 'login' && (
        <header style={{
          height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', background: COLORS.cream, borderBottom: `1px solid ${COLORS.border}`,
          flexShrink: 0, zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {showBack ? (
              <button onClick={goBack} style={iconBtnStyle}>
                <ChevronLeft size={22} color={COLORS.brown} />
              </button>
            ) : (
              <div style={{ width: 22 }} />
            )}
            <h1 style={{
              fontFamily: FONTS.display, fontSize: 18, color: COLORS.brown,
              fontWeight: 600, letterSpacing: '0.5px'
            }}>
              {screen === 'dashboard' ? 'NYISH' : TAB_LABELS[screen] || screen.charAt(0).toUpperCase() + screen.slice(1)}
            </h1>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!online && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: '#FEE2E2', borderRadius: 12 }}>
                <WifiOff size={14} color={COLORS.red} />
                <span style={{ fontSize: 11, color: COLORS.red, fontWeight: 500 }}>Offline</span>
              </div>
            )}
            {queueCount > 0 && online && (
              <div style={{
                background: COLORS.gold, color: '#fff', fontSize: 11, fontWeight: 600,
                padding: '2px 8px', borderRadius: 12
              }}>{queueCount} pending</div>
            )}
            <button onClick={() => navigateTo('profile')} style={iconBtnStyle}>
              <User size={20} color={COLORS.brown} />
            </button>
          </div>
        </header>
      )}

      <main style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch', position: 'relative'
      }}>
        <ScreenComponent
          user={user}
          profile={profile}
          setProfile={setProfile}
          setUser={setUser}
          navigateTo={navigateTo}
          goBack={goBack}
          isOfficial={isOfficial}
          handleLogout={handleLogout}
        />
      </main>

      {showNav && (
        <nav style={{
          height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-around',
          background: '#fff', borderTop: `1px solid ${COLORS.border}`,
          flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          zIndex: 10
        }}>
          {TAB_SCREENS.map(tab => {
            const Icon = TAB_ICONS[tab]
            const active = screen === tab
            return (
              <button
                key={tab}
                onClick={() => navigateTo(tab, true)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 4, padding: '8px 12px', border: 'none', background: 'none',
                  cursor: 'pointer', color: active ? COLORS.gold : COLORS.textMuted,
                  transition: 'color 0.2s'
                }}
              >
                <Icon size={22} strokeWidth={active ? 2.5 : 2} />
                <span style={{ fontSize: 10, fontWeight: active ? 600 : 500 }}>{TAB_LABELS[tab]}</span>
              </button>
            )
          })}
        </nav>
      )}
    </div>
  )
}

const iconBtnStyle = {
  background: 'none', border: 'none', padding: 6, borderRadius: 8,
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'background 0.2s'
}
