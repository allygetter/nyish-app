import { Clock } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/Button'
import { supabase } from '../lib/supabase'

export function PendingApproval() {
  const { profile } = useAuth()

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-gradient-to-b from-amber-50 to-white dark:from-slate-950 dark:to-slate-950">
      <div className="w-full max-w-sm text-center animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-6">
          <Clock className="text-amber-600 dark:text-amber-400" size={36} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white font-display mb-2">Awaiting Approval</h1>
        <p className="text-slate-600 dark:text-slate-400 mb-2">
          Hi <span className="font-semibold text-slate-900 dark:text-white">{profile?.full_name}</span>,
        </p>
        <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">
          Your account is pending approval from the Chairperson. You'll be notified once your access is granted.
        </p>
        <Button variant="ghost" onClick={handleLogout}>Sign Out</Button>
      </div>
    </div>
  )
}
