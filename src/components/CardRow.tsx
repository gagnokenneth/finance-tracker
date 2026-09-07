import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

const SHELL = 'block rounded-xl border border-edge bg-white p-5'

/**
 * The interactive-shell suffix — hover lift plus focus ring — for any
 * clickable row styled like a CardRow but that can't be one (e.g. a plain
 * `<button>` where the target has no detail route to link to).
 */
export const CARD_ROW_INTERACTIVE_CLASS = `${SHELL} transition-[box-shadow,border-color] hover:border-brand/30 hover:shadow-md hover:shadow-ink/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand`

/**
 * A card in one of the top-level lists, linking to its detail page.
 *
 * A pending row is not a link: its id exists only in the cache, so the route
 * would find nothing until the write returns the real one. It keeps the card's
 * shape and loses the hover lift, so it reads as present but not yet actionable.
 */
export function CardRow({
  to,
  pending,
  children,
}: {
  to: string
  pending: boolean
  children: ReactNode
}) {
  if (pending) return <div className={SHELL}>{children}</div>

  return (
    <Link to={to} className={CARD_ROW_INTERACTIVE_CLASS}>
      {children}
    </Link>
  )
}
