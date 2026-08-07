import type { ReactNode } from 'react'

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
      />
      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-edge bg-white p-6 shadow-xl shadow-ink/10">
        <h2 className="mb-4 text-base font-semibold tracking-tight text-ink">{title}</h2>
        {children}
      </div>
    </div>
  )
}
