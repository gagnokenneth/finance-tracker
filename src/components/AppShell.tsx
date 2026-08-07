import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth.ts'

const NAV_ITEMS = [
  { to: '/debts', label: 'Debts' },
  { to: '/settings', label: 'Settings' },
]

export function AppShell() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive ? 'bg-ink text-white' : 'text-ink-soft hover:bg-paper hover:text-ink'
    }`

  return (
    <div className="min-h-screen bg-paper">
      {/* Compact bar shown only below md, where the sidebar is off-canvas. */}
      <div className="flex items-center gap-3 border-b border-edge bg-white px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="rounded-lg border border-edge px-2 py-1 text-ink-soft hover:bg-paper"
        >
          ☰
        </button>
        <span className="font-semibold tracking-tight text-ink">Finance Tracker</span>
      </div>

      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-10 bg-ink/40 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-20 flex w-60 flex-col border-r border-edge bg-white transition-transform md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-5">
          <div className="text-base font-semibold tracking-tight text-ink">Finance Tracker</div>
          <div className="mt-0.5 text-xs text-ink-faint">Debt payoff</div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-edge px-5 py-4">
          <div className="truncate text-sm font-medium text-ink">{user?.name}</div>
          <button
            type="button"
            onClick={signOut}
            className="mt-2 text-xs font-medium text-ink-soft underline-offset-2 hover:text-ink hover:underline"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="px-4 py-8 md:ml-60 md:px-8">
        <div className="mx-auto max-w-4xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
