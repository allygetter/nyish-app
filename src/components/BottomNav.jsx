import { Home, Users, Wallet, Calendar, UserCircle } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { cn } from '../utils/helpers'

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/members', icon: Users, label: 'Members' },
  { to: '/savings', icon: Wallet, label: 'Savings' },
  { to: '/meetings', icon: Calendar, label: 'Meetings' },
  { to: '/profile', icon: UserCircle, label: 'Profile' },
]

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-t border-slate-200/50 dark:border-slate-800/50 safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => cn(
              'flex flex-col items-center justify-center w-full h-full space-y-0.5 transition-all duration-200',
              isActive 
                ? 'text-primary-600 dark:text-primary-400' 
                : 'text-slate-400 dark:text-slate-500 hover:text-slate-600'
            )}
          >
            <Icon size={22} strokeWidth={2.2} />
            <span className="text-[10px] font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
