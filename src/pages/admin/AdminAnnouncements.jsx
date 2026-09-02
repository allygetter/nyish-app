import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'

export default function AdminAnnouncements() {
  const { profile } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState({ title: '', content: '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('announcements').select('*').order('created_at', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { error } = await supabase.from('announcements').insert({ ...form, created_by: profile?.id })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setForm({ title: '', content: '' })
    setModalOpen(false)
    load()
  }

  const handleDelete = async (item) => {
    if (!confirm('Delete this announcement?')) return
    await supabase.from('announcements').delete().eq('id', item.id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="mt-1 text-sm text-ink/60">Post updates for all members.</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn btn-primary">+ New Announcement</button>
      </div>

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState title="No announcements yet" hint="Post your first update to the group." />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <p className="font-display font-semibold text-forest-dark">{a.title}</p>
                <button onClick={() => handleDelete(a)} className="shrink-0 text-sm text-clay hover:underline">Delete</button>
              </div>
              <p className="mt-1 whitespace-pre-line text-sm text-ink/70">{a.content}</p>
              <p className="mt-2 text-xs text-ink/40">
                {new Date(a.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal title="New Announcement" onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="label">Title</label>
              <input required className="input" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Message</label>
              <textarea required rows={4} className="input" value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })} />
            </div>
            {error && <p className="text-sm text-clay">{error}</p>}
            <button type="submit" disabled={saving} className="btn btn-primary w-full">
              {saving ? 'Posting…' : 'Post Announcement'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
