import { useAuth } from '../../context/AuthContext'

export default function MemberProfile() {
  const { profile } = useAuth()

  const rows = [
    ['Full Name', profile?.full_name],
    ['Phone Number', profile?.phone_number],
    ['ID Number', profile?.id_number],
    ['Email', profile?.email || '—'],
    ['Role', profile?.role === 'admin' ? 'Administrator' : 'Member'],
    ['Status', profile?.status === 'active' ? 'Active' : 'Inactive'],
    ['Date Joined', profile?.date_joined ? new Date(profile.date_joined).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'],
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>
      <div className="card divide-y divide-line">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <span className="text-sm text-ink/50">{label}</span>
            <span className="text-sm font-medium">{value}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-ink/40">
        To update your details, please contact the group administrator.
      </p>
    </div>
  )
}
