import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loading } from './Loading'

export function ProtectedRoute({ children, requireAdmin }) {
  const { user, profile, loading, isPending, isRejected } = useAuth()

  if (loading) return <Loading />

  if (!user) return <Navigate to="/login" replace />

  if (isRejected) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h2 className="text-xl font-bold text-red-600 mb-2">Account Rejected</h2>
          <p className="text-slate-600 dark:text-slate-400">Your account has been rejected by the administrator.</p>
        </div>
      </div>
    )
  }

  if (isPending) return <Navigate to="/pending" replace />

  if (requireAdmin && !profile?.is_admin) return <Navigate to="/" replace />

  return children
}
