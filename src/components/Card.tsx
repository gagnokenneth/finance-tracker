import type { ReactNode } from 'react'

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-edge bg-white p-5 shadow-xs shadow-ink/5">
      {title && (
        <h2 className="mb-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">
          {title}
        </h2>
      )}
      {children}
    </div>
  )
}
