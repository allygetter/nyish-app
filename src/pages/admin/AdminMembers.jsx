import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Loading from '../../components/Loading'
import EmptyState from '../../components/EmptyState'
import Modal from '../../components/Modal'

const emptyForm = {
  full_name: '',
  phone_number: '',
  id_number: '',
  email: '',
  role: 'member',
  status: 'active',
  date_joined: new Date().toISOString().slice(0, 10),
}

export default function AdminMembers() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    const { data } = await supabase.from('members').select('*').order('full_name')
    setMembers(data ?? [])
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
      full_name: m.full_name,
      phone_number: m.phone_number,
      id_number: m.id_number,
      email: m.email || '',
      role: m.role,
      status: m.status,
      date_joined: m.date_joined,
    })
    setError('')
    setModalOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const payload = { ...form, email: form.email || null }

    const { error } = editingId
      ? await supabase.from('members').update(payload).eq('id', editingId)
      : await supabase.from('members').insert(payload)

    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    setModalOpen(false)
    load()
  }

  const toggleStatus = async (m) => {
    await supabase
      .from('members')
      .update({ status: m.status === 'active' ? 'inactive' : 'active' })
      .eq('id', m.id)
    load()
  }

  const handleDelete = async (m) => {
    if (!confirm(`Remove ${m.full_name} permanently? This also removes their contribution history.`)) return
    await supabase.from('members').delete().eq('id', m.id)
    load()
  }

  const filtered = members.filter((m) =>
    `${m.full_name} ${m.phone_number} ${m.id_number} ${m.email ?? ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Members</h1>
          <p className="mt-1 text-sm text-ink/60">{members.length} registered members</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary">+ Add Member</button>
      </div>

      <input
        className="input max-w-sm"
        placeholder="Search by name, phone, ID, or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <Loading />
      ) : filtered.length === 0 ? (
        <EmptyState title="No members found" />
      ) : (
        <div className="card overflow-x-auto !p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink/50">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">ID No.</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-medium">{m.full_name}</td>
                  <td className="px-4 py-3">{m.phone_number}</td>
                  <td className="px-4 py-3">{m.id_number}</td>
                  <td className="px-4 py-3 capitalize">{m.role}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${m.status === 'active' ? 'bg-forest/10 text-forest-dark' : 'bg-clay/10 text-clay'}`}>
                      {m.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink/60">{new Date(m.date_joined).toLocaleDateString('en-KE')}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2 whitespace-nowrap">
                      <button onClick={() => openEdit(m)} className="text-sm text-forest hover:underline">Edit</button>
                      <button onClick={() => toggleStatus(m)} className="text-sm text-gold-dark hover:underline">
                        {m.status === 'active' ? 'Deactivate' : 'Activate'}
                      </button>
                      <button onClick={() => handleDelete(m)} className="text-sm text-clay hover:underline">Remove</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal title={editingId ? 'Edit Member' : 'Add Member'} onClose={() => setModalOpen(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input required className="input" value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Phone Number</label>
                <input required className="input" value={form.phone_number}
                  onChange={(e) => setForm({ ...form, phone_number: e.target.value })} />
              </div>
              <div>
                <label className="label">ID Number</label>
                <input required className="input" value={form.id_number}
                  onChange={(e) => setForm({ ...form, id_number: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Email (optional)</label>
              <input type="email" className="input" value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <p className="mt-1 text-xs text-ink/40">Must match the email the member uses to sign up.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Role</label>
                <select className="input" value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select className="input" value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Date Joined</label>
              <input type="date" required className="input" value={form.date_joined}
                onChange={(e) => setForm({ ...form, date_joined: e.target.value })} />
            </div>

            {error && <p className="text-sm text-clay">{error}</p>}

            <button type="submit" disabled={saving} className="btn btn-primary w-full">
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Member'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  )
}
