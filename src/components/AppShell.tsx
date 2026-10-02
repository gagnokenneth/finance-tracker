import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/useAuth.ts'
import { financeKey } from '../hooks/useFinanceData.ts'
import { useEscape } from '../hooks/useEscape.ts'
import { invertOnHover } from './brutal.tsx'

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

/** One row of the account dropdown: full width, inverting to black on hover. */
const menuItemClass = `flex w-full items-center justify-between px-4 py-3 text-left uppercase ${invertOnHover}`

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
      className={`${menuItemClass} border-b border-black disabled:pointer-events-none disabled:opacity-60`}
    >
      <span className="font-medium">{fetching ? 'Refreshing…' : 'Refresh data'}</span>
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
  useEscape(menuOpen, () => setMenuOpen(false))

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex shrink-0 items-center px-4 ${isActive ? 'font-semibold text-black' : invertOnHover}`

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <header className="sticky top-0 z-50 w-full bg-neutral-50">
        <div className="mx-auto flex h-14 max-w-[1720px] items-stretch justify-between gap-2 px-4 font-mono text-xs tracking-wider uppercase sm:px-6">
          <nav
            aria-label="Main Navigation"
            className="flex min-w-0 items-stretch overflow-x-auto"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={linkClass}>
                {({ isActive }) => (
                  <>
                    {isActive && <span className="mr-2 size-1.5 bg-black" />}
                    {item.label}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div ref={menuRef} className="relative flex shrink-0 items-stretch">
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              onClick={() => setMenuOpen((v) => !v)}
              className={`group flex items-center px-4 uppercase ${invertOnHover}`}
            >
              <span className="mr-2 size-2 border border-black bg-white transition-colors group-hover:border-white group-hover:bg-black" />
              <span className="truncate font-bold">{user?.username}</span>
              <svg
                className={`ml-2.5 size-3.5 transition-transform duration-150 ${menuOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19 9l-7 7-7-7" strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute top-full right-0 z-50 mt-px flex w-64 flex-col border border-black bg-white shadow-2xl">
                <RefreshButton />
                <button type="button" onClick={signOut} className={menuItemClass}>
                  <span className="font-medium">Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  )
}

/*
 * Page frames, as layout routes (see App.tsx) rather than a route check in
 * the shell: a redesigned page moves its route from the legacy group to the
 * full-width one, and the shell itself never has to know which is which.
 */
export function FullWidthFrame() {
  return (
    <div className="mx-auto flex w-full max-w-[1720px] flex-col p-4 sm:p-6 lg:p-8">
      <Outlet />
    </div>
  )
}

/** The narrow reading column every page not yet redesigned still uses. */
export function LegacyColumn() {
  return (
    <div className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-4xl">
        <Outlet />
      </div>
    </div>
  )
}
