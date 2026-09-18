import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/useAuth.ts'
import { financeKey } from '../hooks/useFinanceData.ts'
import {
  DashboardIcon,
  TasksIcon,
  NotesIcon,
  GoalsIcon,
  DebtsIcon,
  BillsIcon,
  IncomeIcon,
  SavingsIcon,
  SettingsIcon,
} from './icons.tsx'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: DashboardIcon },
  { to: '/tasks', label: 'Tasks', icon: TasksIcon },
  { to: '/notes', label: 'Notes', icon: NotesIcon },
  { to: '/goals', label: 'Goals', icon: GoalsIcon },
  { to: '/debts', label: 'Debts', icon: DebtsIcon },
  { to: '/bills', label: 'Bills', icon: BillsIcon },
  { to: '/income', label: 'Income', icon: IncomeIcon },
  { to: '/savings', label: 'Savings', icon: SavingsIcon },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
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
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onClickOutside = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `mx-4 px-2 py-1.5 text-sm font-normal uppercase text-ink ${isActive ? 'underline' : 'hover:underline'}`

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
        className={`fixed inset-y-0 left-0 z-20 flex w-60 flex-col bg-white transition-transform md:translate-x-0 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <nav className="flex flex-1 flex-col gap-1 px-1 pt-6">
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
        <div ref={menuRef} className="relative px-3 py-4">
          {menuOpen && (
            <div className="absolute bottom-full left-3 mb-2 w-44 rounded-lg bg-white p-3 shadow-lg shadow-ink/10">
              <RefreshButton />
              <button
                type="button"
                onClick={signOut}
                className={`mt-2 block ${sidebarActionClass}`}
              >
                Sign out
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex w-full items-center justify-between gap-2 rounded-lg bg-paper px-3 py-2 text-sm font-medium text-ink shadow-sm hover:bg-edge/40"
          >
            <span className="truncate">{user?.username}</span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className={`shrink-0 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
            >
              <path
                d="M2.5 4.5L6 8l3.5-3.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
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
