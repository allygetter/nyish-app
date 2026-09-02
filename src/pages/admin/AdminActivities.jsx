import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'

const emptyForm = {
  name: '',
  description: '',
  activity_date: new Date().toISOString().slice(0, 10),
  status: 'Planned',
}

const statusColors = {
  Planned: 'bg-line text-ink/60',
  Ongoing: 'bg-gold/20 text-gold-dark',
  Completed: 'bg-forest/10 text-forest-dark',
  Cancelled: 'bg-clay/10 text-clay',
}

export default function AdminActivities() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('activities').select('*').order('activity_date', { ascending: false })
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

  const openEdit = (a) => {
    setEditingId(a.id)
    setForm({
      name: a.name,
      description: a.description || '',
      activity_date: a.activity_date,
      status: a.status,
    })
    setError('')
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const { error } = editingId
      ? await supabase.from('activities').update(form).eq('id', editingId)
      : await supabase.from('activities').insert(form)
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setModalOpen(false)
    load()
  }

  const handleDelete = async (a) => {
    if (!confirm('Delete this activity?')) return
    await supabase.from('activities').delete().eq('id', a.id)
    load()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Group Activities</h1>
          <p className="mt-1 text-sm text-ink/60">Record projects, trainings, and investment ideas.</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary">+ New Activity</button>
      </div>

      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <EmptyState title="No activities recorded yet" />
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <p className="font-display font-semibold text-forest-dark">{a.name}</p>
                  <span className={`badge ${statusColors[a.status] || 'bg-line'}`}>{a.status}</span>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => openEdit(a)} className="text-sm text-forest hover:underline">Edit</button>
                  <button onClick={() => handleDelete(a)} className="text-sm text-clay hover:underline">Delete</button>
                </div>
              </div>
              {a.description && <p className="mt-2 text-sm text-ink/70">{a.description}</p>}
              <p className="mt-2 text-xs text-ink/40">
                {new Date(a.activity_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal title={editingId ? 'Edit Activity' : 'New Activity'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="label">Activity Name</label>
              <input required className="input" value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea rows={3} className="input" value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date</label>
                <input required type="date" className="input" value={form.activity_date}
                  onChange={(e) => setForm({ ...form, activity_date: e.target.value })} />
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option>Planned</option>
                  <option>Ongoing</option>
                  <option>Completed</option>
                  <option>Cancelled</option>
                </select>
              </div>
            </div>
            {error && <p className="text-sm text-clay">{error}</p>}
            <button type="submit" disabled={saving} className="btn btn-primary w-full">
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Activity'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
