import { Outlet } from 'react-router-dom'
import AppShell from '../../components/AppShell'

const links = [
  { to: '/dashboard', label: 'Dashboard', end: true },
  { to: '/dashboard/contributions', label: 'My Contributions' },
  { to: '/dashboard/announcements', label: 'Announcements' },
  { to: '/dashboard/meetings', label: 'Meetings' },
  { to: '/dashboard/activities', label: 'Group Activities' },
  { to: '/dashboard/profile', label: 'My Profile' },
]

export default function MemberLayout() {
  return (
    <AppShell links={links} sectionLabel="Member Portal">
      <Outlet />
    </AppShell>
  )
}
