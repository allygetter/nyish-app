import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { Input } from '../components/Input'
import { EmptyState } from '../components/EmptyState'
import { Plus, Calendar, MapPin, Users, Check, X } from 'lucide-react'
import { formatDate, cn } from '../utils/helpers'

export function Meetings() {
  const { canManageMeetings } = useAuth()
  const [meetings, setMeetings] = useState([])
  const [members, setMembers] = useState([])
  const [selectedMeeting, setSelectedMeeting] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const [{ data: meetings }, { data: members }] = await Promise.all([
      supabase.from('meetings').select('*, attendance(*)').order('date', { ascending: false }),
      supabase.from('profiles').select('id, full_name, photo_url').eq('status', 'approved'),
    ])
    setMeetings(meetings || [])
    setMembers(members || [])
    setLoading(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    const form = e.target
    const { data: meeting, error } = await supabase.from('meetings').insert({
      date: form.date.value,
      venue: form.venue.value,
      agenda: form.agenda.value,
      notes: form.notes.value,
    }).select().single()

    if (!error && meeting) {
      const attendanceRecords = members.map(m => ({
        meeting_id: meeting.id,
        member_id: m.id,
        present: false,
      }))
      await supabase.from('attendance').insert(attendanceRecords)
      setShowModal(false)
      fetchData()
    }
  }

  const toggleAttendance = async (meetingId, memberId, current) => {
    await supabase.from('attendance').upsert({
      meeting_id: meetingId,
      member_id: memberId,
      present: !current,
    }, { onConflict: 'meeting_id,member_id' })
    fetchData()
  }

  if (loading) return <div className="space-y-3 animate-pulse">{[1,2].map(i => <div key={i} className="h-28 bg-slate-200 dark:bg-slate-800 rounded-2xl" />)}</div>

  return (
    <div className="space-y-5 animate-fade-in">
      {canManageMeetings && (
        <Button onClick={() => setShowModal(true)} className="w-full">
          <Plus size={18} className="mr-2" /> Schedule Meeting
        </Button>
      )}

      <div className="space-y-3">
        {meetings.length === 0 ? (
          <EmptyState title="No meetings scheduled" description="Schedule your first meeting to get started" />
        ) : (
          meetings.map((meeting) => {
            const present = meeting.attendance?.filter(a => a.present).length || 0
            const total = meeting.attendance?.length || 0
            
            return (
              <div key={meeting.id} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5 shadow-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar size={14} className="text-primary-600" />
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{formatDate(meeting.date)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin size={12} />
                      {meeting.venue}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300">
                    <Users size={12} />
                    {present}/{total}
                  </div>
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">{meeting.agenda}</p>
                
                {canManageMeetings && (
                  <button 
                    onClick={() => setSelectedMeeting(selectedMeeting === meeting.id ? null : meeting.id)}
                    className="text-xs font-medium text-primary-600 hover:text-primary-700"
                  >
                    {selectedMeeting === meeting.id ? 'Hide attendance' : 'Take attendance'}
                  </button>
                )}

                {selectedMeeting === meeting.id && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 gap-1.5 animate-fade-in">
                    {members.map((member) => {
                      const record = meeting.attendance?.find(a => a.member_id === member.id)
                      const isPresent = record?.present || false
                      return (
                        <button
                          key={member.id}
                          onClick={() => toggleAttendance(meeting.id, member.id, isPresent)}
                          className={cn(
                            'flex items-center justify-between px-3 py-2 rounded-xl text-sm transition-all',
                            isPresent 
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' 
                              : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400'
                          )}
                        >
                          <span className="font-medium">{member.full_name}</span>
                          {isPresent ? <Check size={14} /> : <X size={14} className="opacity-30" />}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Schedule Meeting">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input name="date" type="datetime-local" required />
          <Input name="venue" placeholder="Venue" required />
          <Input name="agenda" placeholder="Agenda" required />
          <textarea name="notes" placeholder="Notes (optional)" rows={3} className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 resize-none" />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" className="flex-1">Schedule</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
