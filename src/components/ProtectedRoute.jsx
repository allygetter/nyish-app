import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Loading from './Loading'

export default function ProtectedRoute({ children, adminOnly = false }) {
  const { session, isAdmin, isLinked, loading } = useAuth()

  if (loading) return <Loading label="Checking your session…" />

  if (!session) return <Navigate to="/login" replace />

  if (!isLinked) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h2 className="text-xl font-bold">Account not yet linked</h2>
        <p className="mt-2 text-ink/60">
          Your login was successful, but no member record matches this email yet. Please ask
          the group administrator to add you as a member, or confirm the email on file matches
          the one you signed in with.
        </p>
      </div>
    )
  }

  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />

  return children
}
