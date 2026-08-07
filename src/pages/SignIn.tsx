import { useEffect, useRef } from 'react'
import { useAuth } from '../auth/useAuth.ts'

export function SignIn() {
  const { signIn, renderButton, live } = useAuth()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (live) renderButton(ref.current)
  }, [live, renderButton])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-white to-slate-100 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-lg shadow-slate-900/5">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Finance Tracker</h1>
        {/* Names only what the app currently exposes — bills and savings are
            no longer reachable, so listing them would be inaccurate. */}
        <p className="mt-2 text-sm text-slate-500">
          Keep track of what you owe, and what&rsquo;s left to pay.
        </p>

        <div className="mt-8">
          {live ? (
            <div ref={ref} className="flex justify-center" />
          ) : (
            <button
              type="button"
              onClick={signIn}
              className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Sign in with Google
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
