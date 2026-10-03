import { useRef, useState } from 'react'
import { NavLink, Outlet, matchPath, useLocation } from 'react-router-dom'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/useAuth.ts'
import { financeKey } from '../hooks/useFinanceData.ts'
import { useClickOutside } from '../hooks/useClickOutside.ts'
import { useEscape } from '../hooks/useEscape.ts'
import { invertOnHover } from './brutal.tsx'
import { CloseIcon, MenuIcon } from './icons.tsx'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/tasks', label: 'Tasks' },
  { to: '/notes', label: 'Notes' },
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

/** Every main link, for both the desktop bar and the mobile menu: `className`
 *  is the layout, and the current page's weight and marker are shared. */
function NavLinks({ className, onNavigate }: { className: string; onNavigate?: () => void }) {
  return NAV_ITEMS.map((item) => (
    <NavLink
      key={item.to}
      to={item.to}
      onClick={onNavigate}
      className={({ isActive }) => `${className} ${isActive ? 'font-semibold text-black' : invertOnHover}`}
    >
      {({ isActive }) => (
        <>
          {isActive && <span aria-hidden className="mr-2 size-1.5 shrink-0 bg-black" />}
          {item.label}
        </>
      )}
    </NavLink>
  ))
}

export function AppShell() {
  const { user, signOut } = useAuth()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  // Open "at" a path rather than a plain flag, so any route change — a link,
  // the back button — closes the mobile nav without an effect.
  const [navOpenAt, setNavOpenAt] = useState<string | null>(null)
  const navOpen = navOpenAt === pathname
  const closeNav = () => setNavOpenAt(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const navRef = useRef<HTMLDivElement>(null)

  useClickOutside(menuOpen, [menuRef], () => setMenuOpen(false))
  useEscape(menuOpen, () => setMenuOpen(false))
  useClickOutside(navOpen, [navRef], closeNav)
  useEscape(navOpen, closeNav)

  // NavLink's own matching, so a detail page (/bills/3) names its section.
  const current = NAV_ITEMS.find((item) => matchPath({ path: item.to, end: false }, pathname))

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-950">
      <header className="sticky top-0 z-50 w-full bg-neutral-50">
        <div className="mx-auto flex h-14 max-w-[1720px] items-stretch justify-between gap-2 px-4 font-mono text-xs tracking-wider uppercase sm:px-6">
          {/* Eight links don't fit below lg, so there they fold into a
              menu whose toggle names the current page. */}
          <div ref={navRef} className="flex min-w-0 items-stretch lg:hidden">
            <button
              type="button"
              aria-expanded={navOpen}
              aria-controls="mobile-nav"
              onClick={() => setNavOpenAt(navOpen ? null : pathname)}
              className={`flex min-w-0 items-center gap-3 px-4 ${invertOnHover}`}
            >
              {navOpen ? <CloseIcon /> : <MenuIcon />}
              <span className="truncate font-semibold">
                <span className="sr-only">Menu, current page: </span>
                {current?.label ?? 'Menu'}
              </span>
            </button>
            {navOpen && (
              <nav
                id="mobile-nav"
                aria-label="Main Navigation"
                className="absolute inset-x-0 top-full flex max-h-[calc(100dvh-3.5rem)] flex-col overflow-y-auto border-y border-black bg-white shadow-2xl"
              >
                <NavLinks
                  className="flex items-center border-b border-neutral-200 px-4 py-3.5 last:border-b-0 sm:px-6"
                  onNavigate={closeNav}
                />
              </nav>
            )}
          </div>

          <nav aria-label="Main Navigation" className="hidden min-w-0 items-stretch lg:flex">
            <NavLinks className="flex shrink-0 items-center px-4" />
          </nav>

          <div ref={menuRef} className="relative flex min-w-0 shrink-0 items-stretch">
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-haspopup="true"
              onClick={() => setMenuOpen((v) => !v)}
              className={`group flex min-w-0 items-center px-4 uppercase ${invertOnHover}`}
            >
              <span className="mr-2 size-2 shrink-0 border border-black bg-white transition-colors group-hover:border-white group-hover:bg-black" />
              <span className="max-w-[9rem] truncate font-bold sm:max-w-none">{user?.username}</span>
              <svg
                className={`ml-2.5 size-3.5 shrink-0 transition-transform duration-150 motion-reduce:transition-none ${menuOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M19 9l-7 7-7-7" strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute top-full right-0 z-50 mt-px flex w-64 max-w-[calc(100vw-2rem)] flex-col border border-black bg-white shadow-2xl">
                <RefreshButton />
                <button type="button" onClick={signOut} className={menuItemClass}>
                  <span className="font-medium">Sign out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Full width, capped for very wide screens, with the page gutter. */}
      <main className="mx-auto flex w-full max-w-[1720px] flex-col p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
