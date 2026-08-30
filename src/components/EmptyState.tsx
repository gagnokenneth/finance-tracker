import type { ReactNode } from 'react'
import { Strip } from './Strip.tsx'

/**
 * The "nothing here yet" block every list and detail page shows. Carries the
 * same strip motif as the sign-in screen and the sidebar mark, faded, so an
 * empty page reads as this app's own voice rather than a bare placeholder box.
 */
export function EmptyState({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-edge bg-white p-12 text-center">
      <Strip
        ticks={8}
        tickClassName="h-1.5 w-4"
        className="mb-4 justify-center gap-[2px] opacity-25"
      />
      <p className="font-medium text-ink">{title}</p>
      <p className="mt-1 text-sm text-ink-soft">{children}</p>
    </div>
  )
}
