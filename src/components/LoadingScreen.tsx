/**
 * The one loading state in the app — shown in the content area while the
 * first fetch is in flight.
 */
export function LoadingScreen() {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-4 py-24">
      <div aria-hidden className="size-8 animate-spin border-2 border-neutral-200 border-t-black" />
      <p className="font-mono text-xs tracking-wider text-neutral-500 uppercase">Loading your data</p>
    </div>
  )
}
