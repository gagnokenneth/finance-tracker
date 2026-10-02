import { errorDetail } from '../lib/errorText.ts'
import { labelClass, panelClass } from './brutal.tsx'

/**
 * Shows what the backend actually said when a load fails. Setup problems —
 * an empty allowed_email list, a missing deployment — are only diagnosable
 * if their message reaches the screen instead of a generic retry line.
 */
export function LoadError({ error }: { error: unknown }) {
  const detail = errorDetail(error)

  return (
    <div className={`${panelClass} p-6`}>
      <p className={`${labelClass} text-sm`}>Could not load your data</p>
      <p className="mt-2 font-mono text-xs text-neutral-500">
        {detail === '' ? 'Check your connection and reload the page.' : detail}
      </p>
    </div>
  )
}
