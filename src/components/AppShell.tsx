import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'

const TABS = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/funds', label: 'Funds' },
  { to: '/bills', label: 'Bills' },
  { to: '/expendable', label: 'Expendable' },
  { to: '/debts', label: 'Debts' },
  { to: '/savings', label: 'Savings' },
]

export function AppShell() {
  const { user, signOut } = useAuth()
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <span className="text-lg font-bold text-slate-900">Finance</span>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>{user?.name}</span>
            <button
              type="button"
              onClick={signOut}
              className="rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100"
            >
              Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${
                  isActive
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
