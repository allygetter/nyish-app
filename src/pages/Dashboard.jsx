import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { StatCard } from '../components/StatCard'
import { Users, Wallet, CreditCard, Calendar, ChevronRight, Bell } from 'lucide-react'
import { formatCurrency, formatDate } from '../utils/helpers'

export function Dashboard() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [stats, setStats] = useState({ members: 0, savings: 0, loans: 0, nextMeeting: null })
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      const [{ count: members }, { data: contributions }, { data: loans }, { data: meetings }, { data: announcements }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
        supabase.from('contributions').select('amount'),
        supabase.from('loans').select('*').eq('status', 'active'),
        supabase.from('meetings').select('*').gte('date', new Date().toISOString()).order('date', { ascending: true }).limit(1),
        supabase.from('announcements').select('*, profiles(full_name)').order('created_at', { ascending: false }).limit(3),
      ])

      const totalSavings = contributions?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0

      setStats({
        members: members || 0,
        savings: totalSavings,
        loans: loans?.length || 0,
        nextMeeting: meetings?.[0] || null,
      })
      setAnnouncements(announcements || [])
      setLoading(false)
    }
    fetchDashboard()
  }, [])

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
        <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 dark:text-slate-400">Welcome back,</p>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">{profile?.full_name?.split(' ')[0]}</h2>
        </div>
        <div className="px-3 py-1 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 text-xs font-semibold capitalize">
          {profile?.role}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard title="Members" value={stats.members} icon={Users} color="blue" />
        <StatCard title="Total Savings" value={formatCurrency(stats.savings)} icon={Wallet} color="primary" />
        <StatCard title="Active Loans" value={stats.loans} icon={CreditCard} color="amber" />
        <div 
          onClick={() => stats.nextMeeting && navigate('/meetings')}
          className="cursor-pointer"
        >
          <StatCard 
            title="Next Meeting" 
            value={stats.nextMeeting ? formatDate(stats.nextMeeting.date) : 'None'} 
            icon={Calendar} 
            color="rose" 
          />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-primary-600" />
            <h3 className="font-semibold text-slate-900 dark:text-white">Announcements</h3>
          </div>
          <button onClick={() => navigate('/announcements')} className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center">
            View all <ChevronRight size={14} />
          </button>
        </div>
        {announcements.length === 0 ? (
          <div className="px-5 py-6 text-sm text-slate-500 text-center">No announcements yet</div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {announcements.map((a) => (
              <div key={a.id} className="px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <p className="text-sm font-medium text-slate-900 dark:text-white">{a.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{a.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
