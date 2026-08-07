import { useEffect, useRef } from 'react'
import { useAuth } from '../auth/useAuth.ts'

export function SignIn() {
  const { signIn, renderButton, live } = useAuth()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (live) renderButton(ref.current)
  }, [live, renderButton])

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm rounded-2xl border border-edge bg-white p-8 shadow-lg shadow-ink/5">
        {/* A settled strip: the state this app exists to get you to. */}
        <div aria-hidden className="flex gap-[3px]">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i} className="h-1.5 flex-1 rounded-[2px] bg-settled" />
          ))}
        </div>

        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">Finance Tracker</h1>
        {/* Names only what the app currently exposes — bills and savings are
            no longer reachable, so listing them would be inaccurate. */}
        <p className="mt-2 text-sm text-ink-soft">
          Keep track of what you owe, and what&rsquo;s left to pay.
        </p>

        <div className="mt-8">
          {live ? (
            <div ref={ref} className="flex justify-center" />
          ) : (
            <button
              type="button"
              onClick={signIn}
              className="w-full rounded-lg bg-ink py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
