import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Avatar } from '../components/Avatar'
import { EmptyState } from '../components/EmptyState'
import { Input } from '../components/Input'
import { Search } from 'lucide-react'
import { roleColors, cn } from '../utils/helpers'

export function Members() {
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: true })
      setMembers(data || [])
      setLoading(false)
    }
    fetchMembers()
  }, [])

  const filtered = members.filter(m => 
    m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.phone?.includes(search)
  )

  if (loading) return <div className="space-y-3 animate-pulse">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}</div>

  return (
    <div className="space-y-4 animate-fade-in">
      <Input 
        placeholder="Search members..." 
        value={search} 
        onChange={(e) => setSearch(e.target.value)}
        icon={<Search size={16} />}
      />
      
      {filtered.length === 0 ? (
        <EmptyState title="No members found" description="Try a different search term" />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((member) => (
            <div 
              key={member.id} 
              className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all"
            >
              <Avatar url={member.photo_url} name={member.full_name} />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white truncate">{member.full_name}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{member.phone || member.email}</p>
              </div>
              <span className={cn('px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider', roleColors[member.role] || roleColors.member)}>
                {member.role}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
