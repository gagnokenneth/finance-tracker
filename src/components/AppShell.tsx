import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/useAuth.ts'
import { financeKey } from '../hooks/useFinanceData.ts'
import { Strip } from './Strip.tsx'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/debts', label: 'Debts' },
  { to: '/bills', label: 'Bills' },
  { to: '/income', label: 'Income' },
  { to: '/savings', label: 'Savings' },
  { to: '/settings', label: 'Settings' },
]

/** The bare underline-on-hover affordance shared by the sidebar's footer actions. */
const sidebarActionClass =
  'text-xs font-medium text-ink-soft underline-offset-2 hover:text-ink hover:underline'

/**
 * Data is held for minutes at a time, so this is the way to ask for it again
 * without reloading the page — needed most after editing the sheet directly.
 */
function RefreshButton() {
  const qc = useQueryClient()
  const fetching = useIsFetching({ queryKey: financeKey }) > 0

  return (
    <button
      type="button"
      onClick={() => void qc.invalidateQueries({ queryKey: financeKey })}
      disabled={fetching}
      className={`${sidebarActionClass} disabled:no-underline disabled:opacity-60`}
    >
      {fetching ? 'Refreshing…' : 'Refresh data'}
    </button>
  )
}

export function AppShell() {
  const { user, signOut } = useAuth()
  const [open, setOpen] = useState(false)

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-r-lg border-l-2 px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'border-brand bg-brand/8 text-brand'
        : 'border-transparent text-ink-soft hover:border-edge hover:bg-paper hover:text-ink'
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
        <Strip ticks={4} tickClassName="h-3 w-1" className="gap-[2px]" />
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
          <div className="flex items-center gap-2">
            <Strip ticks={4} tickClassName="h-3.5 w-1" className="gap-[2px]" />
            <div className="text-base font-semibold tracking-tight text-ink">Finance Tracker</div>
          </div>
          {/* Deliberately names no module: adding one should not mean editing
              this line. */}
          <div className="mt-0.5 text-xs text-ink-faint">Personal finance</div>
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
          <div className="truncate text-sm font-medium text-ink">{user?.username}</div>
          <div className="mt-2">
            <RefreshButton />
          </div>
          <button
            type="button"
            onClick={signOut}
            className={`mt-2 ${sidebarActionClass}`}
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
