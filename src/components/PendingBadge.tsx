/**
 * Marks a row that exists only in the cache, while the write that created it is
 * in flight. Deliberately quiet: the row's own content is the news, and the badge
 * is gone a second later.
 */
export function PendingBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-ink/5 px-2 py-0.5 text-xs font-medium text-ink-faint ring-1 ring-ink/10 ring-inset">
      Saving…
    </span>
  )
}
