/**
 * What the backend actually said, when that is worth showing. Setup and
 * transport problems — a missing deployment, a non-JSON error page, a timeout —
 * are only diagnosable if their message reaches the screen instead of a generic
 * retry line.
 *
 * Returns '' for the messages that carry no information the surrounding copy
 * does not already give, so callers can render the detail only when there is one.
 */
export function errorDetail(error: unknown): string {
  const message = error instanceof Error ? error.message : ''
  if (message === 'unauthorized' || message === 'Failed to fetch') return ''
  return message
}
