import { useEffect, useRef } from 'react'
import { useAuth } from '../auth/useAuth.ts'

export function SignIn() {
  const { signIn, renderButton, live } = useAuth()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (live) renderButton(ref.current)
  }, [live, renderButton])

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="mb-1 text-xl font-bold text-slate-900">Finance Tracker</h1>
        <p className="mb-6 text-sm text-slate-500">Sign in to continue</p>
        {live ? (
          <div ref={ref} className="flex justify-center" />
        ) : (
          <button
            type="button"
            onClick={signIn}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Sign in with Google
          </button>
        )}
      </div>
    </div>
  )
}
