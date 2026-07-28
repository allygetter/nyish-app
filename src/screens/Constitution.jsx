import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { COLORS, FONTS } from '../lib/styles.js'
import { FileText, Edit3, Save, X } from 'lucide-react'

export default function ConstitutionScreen({ user, profile }) {
  const [text, setText] = useState('')
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState('')
  const [loading, setLoading] = useState(true)
  const isChair = profile?.role === 'chair'

  useEffect(() => {
    loadConstitution()
  }, [])

  async function loadConstitution() {
    setLoading(true)
    const { data } = await supabase.from('nyish_store').select('value').eq('key', 'constitution').single()
    if (data?.value?.text) {
      setText(data.value.text)
      setEditText(data.value.text)
    }
    setLoading(false)
  }

  async function handleSave() {
    const { error } = await supabase.from('nyish_store').update({
      value: { text: editText },
      updated_by: user.id,
      updated_at: new Date().toISOString()
    }).eq('key', 'constitution')
    if (error) alert(error.message)
    else { setText(editText); setEditing(false) }
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: COLORS.textMuted }}>Loading...</div>

  return (
    <div style={{ padding: 16, paddingBottom: 80 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontFamily: FONTS.display, fontSize: 20, color: COLORS.brown }}>Constitution</h2>
        {isChair && !editing && (
          <button onClick={() => setEditing(true)} style={{
            padding: '8px 14px', borderRadius: 10, border: `1px solid ${COLORS.border}`,
            background: '#fff', color: COLORS.brown, fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
          }}>
            <Edit3 size={14} /> Edit
          </button>
        )}
        {editing && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setEditing(false)} style={{
              padding: '8px 14px', borderRadius: 10, border: `1px solid ${COLORS.border}`,
              background: '#fff', color: COLORS.brown, fontSize: 13, cursor: 'pointer'
            }}>
              <X size={14} />
            </button>
            <button onClick={handleSave} style={{
              padding: '8px 14px', borderRadius: 10, border: 'none',
              background: COLORS.green, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6
            }}>
              <Save size={14} /> Save
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <textarea
          value={editText}
          onChange={e => setEditText(e.target.value)}
          style={{
            width: '100%', minHeight: 400, padding: 16, borderRadius: 16,
            border: `1px solid ${COLORS.border}`, fontSize: 14, lineHeight: 1.8,
            color: COLORS.brown, background: '#fff', outline: 'none', resize: 'vertical',
            fontFamily: FONTS.body
          }}
        />
      ) : (
        <div style={{
          background: '#fff', borderRadius: 16, padding: 24, border: `1px solid ${COLORS.border}`,
          whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: 14, color: COLORS.textLight
        }}>
          {text || <p style={{ color: COLORS.textMuted, fontStyle: 'italic' }}>No constitution text set.</p>}
        </div>
      )}
    </div>
  )
}
