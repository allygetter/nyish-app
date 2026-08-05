import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Loading } from './components/Loading'

import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { Members } from './pages/Members'
import { Savings } from './pages/Savings'
import { Loans } from './pages/Loans'
import { Meetings } from './pages/Meetings'
import { Announcements } from './pages/Announcements'
import { Profile } from './pages/Profile'
import { Admin } from './pages/Admin'
import { PendingApproval } from './pages/PendingApproval'

function AuthGate({ children }) {
  const { loading } = useAuth()
  if (loading) return <Loading />
  return children
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthGate>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/pending" element={<PendingApproval />} />

              <Route
                element={
                  <ProtectedRoute>
                    <Layout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<Dashboard />} />
                <Route path="/members" element={<Members />} />
                <Route path="/savings" element={<Savings />} />
                <Route path="/loans" element={<Loans />} />
                <Route path="/meetings" element={<Meetings />} />
                <Route path="/announcements" element={<Announcements />} />
                <Route path="/profile" element={<Profile />} />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Admin />
                    </ProtectedRoute>
                  }
                />
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthGate>
      </AuthProvider>
    </ThemeProvider>
  )
}
