import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function AppShell({ links, sectionLabel, children }) {
  const [open, setOpen] = useState(false)
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const NavLinks = ({ onClick }) => (
    <nav className="flex flex-1 flex-col gap-1">
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.end}
          onClick={onClick}
          className={({ isActive }) =>
            `rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive ? 'bg-forest text-white' : 'text-ink/70 hover:bg-forest/10'
            }`
          }
        >
          {link.label}
        </NavLink>
      ))}
    </nav>
  )

  return (
    <div className="min-h-screen bg-cream md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-white p-5 md:flex">
        <div className="mb-6">
          <p className="font-display text-lg font-bold text-forest-dark">NYISH</p>
          <p className="text-xs text-ink/50">{sectionLabel}</p>
        </div>
        <NavLinks />
        <div className="mt-auto border-t border-line pt-4">
          <p className="truncate text-sm font-medium">{profile?.full_name}</p>
          <p className="truncate text-xs text-ink/50">{profile?.role === 'admin' ? 'Administrator' : 'Member'}</p>
          <button onClick={handleSignOut} className="btn btn-ghost mt-3 w-full !px-0 !py-2 justify-start">
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 md:hidden">
          <div>
            <p className="font-display text-base font-bold text-forest-dark">NYISH</p>
            <p className="text-xs text-ink/50">{sectionLabel}</p>
          </div>
          <button
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="rounded-md p-2 hover:bg-forest/10"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {/* Mobile slide-over menu */}
        {open && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 right-0 flex w-72 flex-col bg-white p-5 shadow-xl">
              <div className="mb-6 flex items-center justify-between">
                <p className="font-display text-lg font-bold text-forest-dark">Menu</p>
                <button aria-label="Close menu" onClick={() => setOpen(false)} className="rounded-md p-1.5 hover:bg-forest/10">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
              <NavLinks onClick={() => setOpen(false)} />
              <div className="mt-auto border-t border-line pt-4">
                <p className="truncate text-sm font-medium">{profile?.full_name}</p>
                <p className="truncate text-xs text-ink/50">{profile?.role === 'admin' ? 'Administrator' : 'Member'}</p>
                <button onClick={handleSignOut} className="btn btn-ghost mt-3 w-full !px-0 !py-2 justify-start">
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
