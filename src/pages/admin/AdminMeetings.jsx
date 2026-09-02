import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'

const emptyForm = {
  title: '',
  meeting_date: new Date().toISOString().slice(0, 10),
  meeting_time: '',
  location: '',
  description: '',
}

export default function AdminMeetings() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('meetings').select('*').order('meeting_date', { ascending: false })
    setItems(data ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setError('')
    setModalOpen(true)
  }

  const openEdit = (m) => {
    setEditingId(m.id)
    setForm({
      title: m.title,
      meeting_date: m.meeting_date,
      meeting_time: m.meeting_time || '',
      location: m.location || '',
      description: m.description || '',
    })
    setError('')
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = { ...form, meeting_time: form.meeting_time || null }
    const { error } = editingId
      ? await supabase.from('meetings').update(payload).eq('id', editingId)
      : await supabase.from('meetings').insert(payload)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setModalOpen(false)
    load()
  }

  const handleDelete = async (m) => {
    if (!confirm('Delete this meeting?')) return
    await supabase.from('meetings').delete().eq('id', m.id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Meetings</h1>
          <p className="mt-1 text-sm text-ink/60">Schedule and manage group meetings.</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary">+ New Meeting</button>
      </div>

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState title="No meetings scheduled" />
      ) : (
        <div className="space-y-3">
          {items.map((m) => (
            <div key={m.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display font-semibold text-forest-dark">{m.title}</p>
                  {m.location && <p className="text-sm text-ink/60">{m.location}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => openEdit(m)} className="text-sm text-forest hover:underline">Edit</button>
                  <button onClick={() => handleDelete(m)} className="text-sm text-clay hover:underline">Delete</button>
                </div>
              </div>
              {m.description && <p className="mt-2 text-sm text-ink/70">{m.description}</p>}
              <p className="mt-2 text-xs text-ink/40">
                {new Date(m.meeting_date).toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {m.meeting_time && ` · ${m.meeting_time}`}
              </p>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal title={editingId ? 'Edit Meeting' : 'New Meeting'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="label">Meeting Title</label>
              <input required className="input" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date</label>
                <input required type="date" className="input" value={form.meeting_date}
                  onChange={(e) => setForm({ ...form, meeting_date: e.target.value })} />
              </div>
              <div>
                <label className="label">Time (optional)</label>
                <input type="time" className="input" value={form.meeting_time}
                  onChange={(e) => setForm({ ...form, meeting_time: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea rows={3} className="input" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            {error && <p className="text-sm text-clay">{error}</p>}
            <button type="submit" disabled={saving} className="btn btn-primary w-full">
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Create Meeting'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
