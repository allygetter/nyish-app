import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Button } from '../components/Button'
import { Avatar } from '../components/Avatar'
import { EmptyState } from '../components/EmptyState'
import { CheckCircle, XCircle, Trash2, Shield } from 'lucide-react'
import { roleColors, statusColors, cn } from '../utils/helpers'

const ROLES = ['chairperson', 'secretary', 'treasurer', 'member']

export function Admin() {
  const [pendingUsers, setPendingUsers] = useState([])
  const [approvedUsers, setApprovedUsers] = useState([])
  const [activeTab, setActiveTab] = useState('pending')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    setPendingUsers(data?.filter(u => u.status === 'pending') || [])
    setApprovedUsers(data?.filter(u => u.status === 'approved') || [])
    setLoading(false)
  }

  const updateStatus = async (id, status) => {
    await supabase.from('profiles').update({ status }).eq('id', id)
    fetchUsers()
  }

  const updateRole = async (id, role) => {
    await supabase.from('profiles').update({ 
      role, 
      is_admin: role === 'chairperson' 
    }).eq('id', id)
    fetchUsers()
  }

  const deleteUser = async (id) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    await supabase.from('profiles').delete().eq('id', id)
    fetchUsers()
  }

  if (loading) return <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}</div>

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
        <button
          onClick={() => setActiveTab('pending')}
          className={cn(
            'flex-1 py-2 text-xs font-semibold rounded-lg transition-all',
            activeTab === 'pending' 
              ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' 
              : 'text-slate-500 dark:text-slate-400'
          )}
        >
          Pending ({pendingUsers.length})
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={cn(
            'flex-1 py-2 text-xs font-semibold rounded-lg transition-all',
            activeTab === 'members' 
              ? 'bg-white dark:bg-slate-700 text-primary-600 shadow-sm' 
              : 'text-slate-500 dark:text-slate-400'
          )}
        >
          Members ({approvedUsers.length})
        </button>
      </div>

      {activeTab === 'pending' && (
        <div className="space-y-2.5">
          {pendingUsers.length === 0 ? (
            <EmptyState title="No pending users" description="All member requests have been processed" />
          ) : (
            pendingUsers.map((user) => (
              <div key={user.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar url={user.photo_url} name={user.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.full_name}</p>
                    <p className="text-xs text-slate-500">{user.email} &middot; {user.phone}</p>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase', statusColors[user.status])}>
                    {user.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="primary" className="flex-1" onClick={() => updateStatus(user.id, 'approved')}>
                    <CheckCircle size={14} className="mr-1.5" /> Approve
                  </Button>
                  <Button size="sm" variant="danger" className="flex-1" onClick={() => updateStatus(user.id, 'rejected')}>
                    <XCircle size={14} className="mr-1.5" /> Reject
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteUser(user.id)}>
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'members' && (
        <div className="space-y-2.5">
          {approvedUsers.length === 0 ? (
            <EmptyState title="No members" description="Approved members will appear here" />
          ) : (
            approvedUsers.map((user) => (
              <div key={user.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar url={user.photo_url} name={user.full_name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.full_name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase', roleColors[user.role])}>
                    {user.role}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield size={12} className="text-slate-400" />
                  <select
                    value={user.role}
                    onChange={(e) => updateRole(user.id, e.target.value)}
                    className="flex-1 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-300 outline-none focus:border-primary-500"
                  >
                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                  </select>
                  <Button size="sm" variant="ghost" onClick={() => deleteUser(user.id)}>
                    <Trash2 size={14} className="text-red-500" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
