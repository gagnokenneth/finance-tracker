/**
 * The payoff strip — this app's signature element.
 *
 * A fixed debt has a known number of installments, so it gets one countable
 * segment per scheduled payment: progress you can literally count off.
 *
 * A revolving debt has no finish line, so it deliberately does NOT get one.
 * Its bar is uniform and frays out to the right instead of ending. The fill
 * encodes no proportion, because there is no total to be a proportion of —
 * inventing one would be a lie about the data.
 */

/** Beyond this, individual segments are too thin to read; use a plain bar. */
const MAX_SEGMENTS = 48

function FixedStrip({ paid, total }: { paid: number; total: number }) {
  const label = `${paid} of ${total} paid`

  if (total > MAX_SEGMENTS) {
    const pct = total === 0 ? 0 : (paid / total) * 100
    return (
      <div className="flex items-center gap-3">
        <div
          role="img"
          aria-label={label}
          className="h-2 flex-1 overflow-hidden rounded-full bg-edge"
        >
          <div
            className="h-full rounded-full bg-settled transition-[width] duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="tnum shrink-0 font-mono text-xs text-ink-soft">{label}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div role="img" aria-label={label} className="flex flex-1 gap-[3px]">
        {Array.from({ length: total }, (_, i) => (
          <span
            key={i}
            className={`h-2 flex-1 rounded-[2px] transition-colors duration-300 ${
              i < paid ? 'bg-settled' : 'bg-edge'
            }`}
          />
        ))}
      </div>
      <span className="tnum shrink-0 font-mono text-xs text-ink-soft">{label}</span>
    </div>
  )
}

function RevolvingStrip({ paid }: { paid: number }) {
  const label = paid === 1 ? '1 statement paid' : `${paid} statements paid`
  return (
    <div className="flex items-center gap-3">
      <div
        role="img"
        aria-label={`Open-ended debt, ${label}`}
        className="h-2 flex-1 rounded-l-full bg-linear-to-r from-ink-soft via-ink-faint to-transparent"
      />
      <span className="shrink-0 font-mono text-xs text-ink-soft">
        Open-ended<span className="text-ink-faint"> · </span>
        <span className="tnum">{label}</span>
      </span>
    </div>
  )
}

export function InstallmentStrip(
  props: { kind: 'fixed'; paid: number; total: number } | { kind: 'revolving'; paid: number },
) {
  if (props.kind === 'revolving') return <RevolvingStrip paid={props.paid} />
  return <FixedStrip paid={props.paid} total={props.total} />
}
