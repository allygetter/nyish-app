import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { Input } from '../components/Input'
import { EmptyState } from '../components/EmptyState'
import { Plus, Megaphone, Clock } from 'lucide-react'
import { formatDateTime } from '../utils/helpers'

export function Announcements() {
  const { profile, canPostAnnouncements } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  const fetchAnnouncements = async () => {
    const { data } = await supabase
      .from('announcements')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false })
    setAnnouncements(data || [])
    setLoading(false)
  }

  const handlePost = async (e) => {
    e.preventDefault()
    const form = e.target
    const { error } = await supabase.from('announcements').insert({
      title: form.title.value,
      message: form.message.value,
      created_by: profile.id,
    })
    if (!error) {
      setShowModal(false)
      fetchAnnouncements()
    }
  }

  if (loading) return <div className="space-y-3 animate-pulse">{[1,2,3].map(i => <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}</div>

  return (
    <div className="space-y-5 animate-fade-in">
      {canPostAnnouncements && (
        <Button onClick={() => setShowModal(true)} className="w-full">
          <Plus size={18} className="mr-2" /> Post Announcement
        </Button>
      )}

      <div className="space-y-3">
        {announcements.length === 0 ? (
          <EmptyState title="No announcements" description="Announcements from the leadership will appear here" />
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Megaphone className="text-primary-600 dark:text-primary-400" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{a.title}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">{a.message}</p>
                  <div className="flex items-center gap-1.5 mt-3 text-[11px] text-slate-400 dark:text-slate-500">
                    <Clock size={11} />
                    <span>{formatDateTime(a.created_at)}</span>
                    <span className="mx-1">&middot;</span>
                    <span>{a.profiles?.full_name}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Announcement">
        <form onSubmit={handlePost} className="space-y-4">
          <Input name="title" placeholder="Title" required />
          <textarea name="message" placeholder="Message" rows={4} required className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">Post</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
