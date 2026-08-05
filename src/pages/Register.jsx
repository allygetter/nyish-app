import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Leaf, ArrowLeft } from 'lucide-react'

export function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data: existing } = await supabase.from('profiles').select('id').limit(1)
    const isFirstUser = !existing || existing.length === 0

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          full_name: form.fullName,
          phone: form.phone,
        }
      }
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('profiles').insert({
        id: data.user.id,
        full_name: form.fullName,
        email: form.email,
        phone: form.phone,
        role: isFirstUser ? 'chairperson' : 'member',
        is_admin: isFirstUser,
        status: isFirstUser ? 'approved' : 'pending',
      })
    }

    setLoading(false)
    navigate(isFirstUser ? '/' : '/pending')
  }

  return (
    <div className="min-h-screen flex flex-col px-6 py-8 bg-gradient-to-b from-primary-50 to-white dark:from-slate-950 dark:to-slate-950">
      <button onClick={() => navigate('/login')} className="mb-6 flex items-center text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
        <ArrowLeft size={16} className="mr-1" /> Back
      </button>
      
      <div className="w-full max-w-sm mx-auto animate-slide-up">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-emerald-700 flex items-center justify-center shadow-lg">
            <Leaf className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white font-display">Join NYISH</h1>
            <p className="text-xs text-slate-500">Create your account</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input name="fullName" placeholder="Full name" value={form.fullName} onChange={handleChange} required />
          <Input name="email" type="email" placeholder="Email address" value={form.email} onChange={handleChange} required />
          <Input name="phone" type="tel" placeholder="Phone number" value={form.phone} onChange={handleChange} required />
          <Input name="password" type="password" placeholder="Create password" value={form.password} onChange={handleChange} required minLength={6} />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" isLoading={loading} className="w-full">
            Create Account
          </Button>
        </form>
      </div>
    </div>
  )
}
