import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Button } from '../components/Button'
import { Input } from '../components/Input'
import { Leaf } from 'lucide-react'

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    
    if (error) setError(error.message)
    else navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-primary-50 to-white dark:from-slate-950 dark:to-slate-950">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-emerald-700 flex items-center justify-center shadow-xl shadow-primary-600/20 mb-4">
            <Leaf className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white font-display tracking-tight">NYISH</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Your chama, simplified.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          {error && <p className="text-sm text-red-500 text-center">{error}</p>}
          <Button type="submit" isLoading={loading} className="w-full">
            Sign In
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          New member?{' '}
          <Link to="/register" className="font-semibold text-primary-600 dark:text-primary-400 hover:underline">
            Join the chama
          </Link>
        </p>
      </div>
    </div>
  )
}
