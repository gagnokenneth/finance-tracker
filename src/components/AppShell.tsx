import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/useAuth.ts'
import { financeKey } from '../hooks/useFinanceData.ts'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/notes', label: 'Notes' },
  { to: '/goals', label: 'Goals' },
  { to: '/debts', label: 'Debts' },
  { to: '/bills', label: 'Bills' },
  { to: '/income', label: 'Income' },
  { to: '/savings', label: 'Savings' },
  { to: '/settings', label: 'Settings' },
]

/** The bare underline-on-hover affordance shared by the account menu's actions. */
const menuActionClass =
  'text-xs font-medium uppercase text-ink-soft underline-offset-2 hover:text-ink hover:underline'

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
      className={`${menuActionClass} disabled:no-underline disabled:opacity-60`}
    >
      {fetching ? 'Refreshing…' : 'Refresh data'}
    </button>
  )
}

export function AppShell() {
  const { user, signOut } = useAuth()
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
    `flex items-center gap-1.5 px-2 py-1.5 text-xs font-normal uppercase ${
      isActive ? 'text-black' : 'text-black/50'
    }`

  return (
    <div className="min-h-screen bg-paper">
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 bg-paper px-6 py-4">
        <div />
        <nav className="flex flex-wrap items-center justify-center gap-5">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={linkClass}>
              {({ isActive }) => (
                <>
                  {isActive && <span className="size-1.5 bg-black" />}
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div ref={menuRef} className="relative justify-self-end">
          {menuOpen && (
            <div className="absolute right-0 top-full z-10 mt-2 w-44 bg-paper p-3">
              <RefreshButton />
              <button
                type="button"
                onClick={signOut}
                className={`mt-2 block ${menuActionClass}`}
              >
                Sign out
              </button>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 text-xs font-normal uppercase text-black/50"
          >
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
            <span className="truncate">{user?.username}</span>
          </button>
        </div>
      </header>

      <main className="px-4 py-8 md:px-8">
        <div className="mx-auto max-w-4xl">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
