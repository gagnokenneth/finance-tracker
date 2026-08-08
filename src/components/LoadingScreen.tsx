/**
 * The one loading state in the app — shown in the content area while the
 * first fetch is in flight.
 */
export function LoadingScreen() {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-4 py-24">
      <div
        aria-hidden
        className="size-8 animate-spin rounded-full border-2 border-edge border-t-brand"
      />
      <p className="text-sm text-ink-soft">Loading your data</p>
    </div>
  )
}
