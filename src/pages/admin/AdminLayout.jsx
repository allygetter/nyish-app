import { Outlet } from 'react-router-dom'
import AppShell from '../../components/AppShell'

const links = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/members', label: 'Members' },
  { to: '/admin/contributions', label: 'Contributions' },
  { to: '/admin/announcements', label: 'Announcements' },
  { to: '/admin/meetings', label: 'Meetings' },
  { to: '/admin/activities', label: 'Activities' },
]

export default function AdminLayout() {
  return (
    <AppShell links={links} sectionLabel="Admin Dashboard">
      <Outlet />
    </AppShell>
  )
}
