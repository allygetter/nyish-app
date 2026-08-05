import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Avatar } from '../components/Avatar'
import { Camera, LogOut, Mail } from 'lucide-react'
import { roleColors, cn } from '../utils/helpers'

export function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState('')
  const [photoFile, setPhotoFile] = useState(null)

  const handleUpdate = async (e) => {
    e.preventDefault()
    setUpdating(true)
    setMessage('')

    const form = e.target
    let photoUrl = profile?.photo_url

    if (photoFile) {
      const fileExt = photoFile.name.split('.').pop()
      const fileName = `${user.id}-${Date.now()}.${fileExt}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, photoFile)
      if (!uploadError) photoUrl = fileName
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: form.full_name.value,
        phone: form.phone.value,
        photo_url: photoUrl,
      })
      .eq('id', user.id)

    if (error) setMessage('Error updating profile')
    else {
      setMessage('Profile updated successfully')
      refreshProfile()
    }
    setUpdating(false)
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    const form = e.target
    if (form.new_password.value !== form.confirm_password.value) {
      setMessage('Passwords do not match')
      return
    }
    const { error } = await supabase.auth.updateUser({
      password: form.new_password.value,
    })
    setMessage(error ? error.message : 'Password updated')
    if (!error) form.reset()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col items-center">
        <div className="relative">
          <Avatar url={profile?.photo_url} name={profile?.full_name} size="xl" />
          <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center cursor-pointer shadow-lg hover:bg-primary-700 transition-colors">
            <Camera size={14} />
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setPhotoFile(e.target.files[0])} />
          </label>
        </div>
        <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{profile?.full_name}</h2>
        <span className={cn('mt-1 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider', roleColors[profile?.role] || roleColors.member)}>
          {profile?.role}
        </span>
      </div>

      <form onSubmit={handleUpdate} className="space-y-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Personal Info</h3>
        <Input name="full_name" defaultValue={profile?.full_name} label="Full Name" required />
        <Input name="phone" type="tel" defaultValue={profile?.phone} label="Phone" />
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
          <Mail size={16} className="text-slate-400" />
          <span className="text-sm text-slate-600 dark:text-slate-300">{profile?.email}</span>
        </div>
        <Button type="submit" isLoading={updating} className="w-full">Save Changes</Button>
        {message && <p className="text-xs text-center text-primary-600 dark:text-primary-400">{message}</p>}
      </form>

      <form onSubmit={handlePasswordChange} className="space-y-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-5">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Change Password</h3>
        <Input name="new_password" type="password" placeholder="New password" required minLength={6} />
        <Input name="confirm_password" type="password" placeholder="Confirm password" required />
        <Button type="submit" variant="secondary" className="w-full">Update Password</Button>
      </form>

      <Button variant="danger" onClick={handleLogout} className="w-full">
        <LogOut size={18} className="mr-2" /> Sign Out
      </Button>
    </div>
  )
}
