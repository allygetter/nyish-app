import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const { error } = await signUp(email, password)
    setSubmitting(false)
    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-sm">
        <Link to="/login" className="text-sm text-forest hover:underline">
          ← Back to login
        </Link>
        <div className="card mt-4">
          <h1 className="text-xl font-bold">Set Up Your Account</h1>
          <p className="mt-1 text-sm text-ink/60">
            Use the exact email address your administrator registered you with.
          </p>

          {done ? (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-forest-dark">
                Account created. If email confirmation is enabled on this project, check your
                inbox before signing in.
              </p>
              <button onClick={() => navigate('/login')} className="btn btn-primary w-full">
                Go to Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div>
                <label className="label" htmlFor="email">Registered Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="password">Choose a Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  className="input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-clay">{error}</p>}

              <button type="submit" disabled={submitting} className="btn btn-primary w-full">
                {submitting ? 'Creating account…' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
