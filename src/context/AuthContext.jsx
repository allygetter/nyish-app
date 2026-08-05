import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    return data
  }

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      }
      setLoading(false)
    }
    init()

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      } else {
        setUser(null)
        setProfile(null)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const refreshProfile = () => {
    if (user) fetchProfile(user.id)
  }

  const isAdmin = profile?.is_admin === true
  const isApproved = profile?.status === 'approved'
  const isPending = profile?.status === 'pending'
  const isRejected = profile?.status === 'rejected'

  const canApprove = isAdmin
  const canManageSavings = isAdmin || profile?.role === 'treasurer'
  const canManageLoans = profile?.role === 'treasurer'
  const canManageMeetings = profile?.role === 'secretary' || isAdmin
  const canPostAnnouncements = profile?.role === 'secretary' || isAdmin

  return (
    <AuthContext.Provider value={{
      user, profile, loading, refreshProfile,
      isAdmin, isApproved, isPending, isRejected,
      canApprove, canManageSavings, canManageLoans,
      canManageMeetings, canPostAnnouncements,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
