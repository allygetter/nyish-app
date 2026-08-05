import { Outlet, useLocation, Link } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { useAuth } from '../context/AuthContext'
import { ThemeToggle } from './ThemeToggle'
import { Shield } from 'lucide-react'

const pageTitles = {
  '/': 'Dashboard',
  '/members': 'Members',
  '/savings': 'Savings',
  '/loans': 'Loans',
  '/meetings': 'Meetings',
  '/announcements': 'Announcements',
  '/profile': 'Profile',
  '/admin': 'Admin',
}

export function Layout() {
  const { isAdmin } = useAuth()
  const location = useLocation()
  const title = pageTitles[location.pathname] || 'NYISH'

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      <header className="sticky top-0 z-30 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-primary-600/20">
              <span className="text-white font-bold text-xs font-display">N</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white font-display">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link 
                to="/admin" 
                className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 hover:bg-amber-100 transition-colors"
              >
                <Shield size={18} />
              </Link>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>
      
      <main className="max-w-lg mx-auto px-4 py-6">
        <Outlet />
      </main>
      
      <BottomNav />
    </div>
  )
}
