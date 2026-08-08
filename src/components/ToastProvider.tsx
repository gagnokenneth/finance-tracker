import { createContext, useCallback, useState } from 'react'
import type { ReactNode } from 'react'

export type ShowError = (message: string) => void

// eslint-disable-next-line react-refresh/only-export-components
export const ToastContext = createContext<ShowError | null>(null)

interface Toast {
  id: number
  message: string
}

const DISMISS_AFTER = 8000

let nextId = 0

/**
 * Where a failed write goes when there is no longer a form to report into.
 * Optimistic writes close their modal immediately, so without this a rejected
 * payment would roll back with nothing on screen to say it had — the change
 * would simply appear not to have happened.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id))
  }, [])

  const showError = useCallback<ShowError>(
    (message) => {
      const id = nextId++
      setToasts((current) => [...current, { id, message }])
      // Long enough to read and act on; these report lost work, not progress.
      window.setTimeout(() => dismiss(id), DISMISS_AFTER)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={showError}>
      {children}
      <div
        role="alert"
        aria-live="assertive"
        className="pointer-events-none fixed inset-x-4 bottom-4 z-30 flex flex-col items-center gap-2 md:inset-x-auto md:right-6 md:items-end"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-overdue/30 bg-overdue-wash p-4 shadow-lg"
          >
            <p className="flex-1 text-sm text-ink">{toast.message}</p>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
              className="text-sm text-ink-soft hover:text-ink"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
