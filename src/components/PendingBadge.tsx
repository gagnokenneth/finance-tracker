import { chipClass } from './brutal.tsx'

/**
 * Marks a row that exists only in the cache, while the write that created it is
 * in flight. Deliberately quiet — the faintest chip: the row's own content is
 * the news, and the badge is gone a second later.
 */
export function PendingBadge() {
  return <span className={`${chipClass} border-neutral-300 bg-neutral-100 text-neutral-500`}>Saving…</span>
}
