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
    `rounded-md px-3 py-2 text-sm font-medium ${
      isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Compact bar shown only below md, where the sidebar is off-canvas. */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="rounded-md border border-slate-300 px-2 py-1 text-slate-600 hover:bg-slate-100"
        >
          ☰
        </button>
        <span className="text-lg font-bold text-slate-900">Finance</span>
      </div>

      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-10 bg-slate-900/40 md:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-20 flex w-56 flex-col border-r border-slate-200 bg-white transition-transform md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-4 py-4 text-lg font-bold text-slate-900">Finance</div>
        <nav className="flex flex-1 flex-col gap-1 px-2">
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
        <div className="border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
          <div className="truncate">{user?.name}</div>
          <button
            type="button"
            onClick={signOut}
            className="mt-2 rounded-md border border-slate-300 px-2 py-1 hover:bg-slate-100"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="px-4 py-6 md:ml-56">
        <div className="mx-auto max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
