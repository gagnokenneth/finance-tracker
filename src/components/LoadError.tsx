import { errorDetail } from '../lib/errorText.ts'

/**
 * Shows what the backend actually said when a load fails. Setup problems —
 * an empty allowed_email list, a missing deployment — are only diagnosable
 * if their message reaches the screen instead of a generic retry line.
 */
export function LoadError({ error }: { error: unknown }) {
  const detail = errorDetail(error)

  return (
    <div className="rounded-xl border border-edge bg-white p-6">
      <p className="font-medium text-overdue">Could not load your data</p>
      <p className="mt-1 text-sm text-ink-soft">
        {detail === '' ? 'Check your connection and reload the page.' : detail}
      </p>
    </div>
  )
}
