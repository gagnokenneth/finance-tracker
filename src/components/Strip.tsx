/**
 * The app's one recurring mark: a row of small ticks, first drawn as the
 * fixed-debt payoff strip (InstallmentStrip) and reused on the sign-in screen
 * as "the state this app exists to get you to." Shared here so the sidebar's
 * wordmark and every empty state can carry the same motif instead of each
 * page inventing its own decoration.
 */
export function Strip({
  ticks = 5,
  tickClassName = 'h-1.5 w-1.5',
  className = 'gap-[2px]',
}: {
  ticks?: number
  tickClassName?: string
  /** Replaces the default entirely — always include a gap-* utility here. */
  className?: string
}) {
  return (
    <div aria-hidden className={`flex ${className}`}>
      {Array.from({ length: ticks }, (_, i) => (
        <span key={i} className={`${tickClassName} rounded-[2px] bg-settled`} />
      ))}
    </div>
  )
}
