import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import Home from './pages/Home'
import About from './pages/About'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import PublicAnnouncements from './pages/PublicAnnouncements'

import MemberLayout from './pages/member/MemberLayout'
import MemberDashboard from './pages/member/MemberDashboard'
import MemberContributions from './pages/member/MemberContributions'
import MemberAnnouncements from './pages/member/MemberAnnouncements'
import MemberMeetings from './pages/member/MemberMeetings'
import MemberActivities from './pages/member/MemberActivities'
import MemberProfile from './pages/member/MemberProfile'

import AdminLayout from './pages/admin/AdminLayout'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminMembers from './pages/admin/AdminMembers'
import AdminContributions from './pages/admin/AdminContributions'
import AdminAnnouncements from './pages/admin/AdminAnnouncements'
import AdminMeetings from './pages/admin/AdminMeetings'
import AdminActivities from './pages/admin/AdminActivities'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/announcements" element={<PublicAnnouncements />} />

          {/* Member area */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <MemberLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<MemberDashboard />} />
            <Route path="contributions" element={<MemberContributions />} />
            <Route path="announcements" element={<MemberAnnouncements />} />
            <Route path="meetings" element={<MemberMeetings />} />
            <Route path="activities" element={<MemberActivities />} />
            <Route path="profile" element={<MemberProfile />} />
          </Route>

          {/* Admin area */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="members" element={<AdminMembers />} />
            <Route path="contributions" element={<AdminContributions />} />
            <Route path="announcements" element={<AdminAnnouncements />} />
            <Route path="meetings" element={<AdminMeetings />} />
            <Route path="activities" element={<AdminActivities />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
