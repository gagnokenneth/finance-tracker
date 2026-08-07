import { useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../auth/useAuth.ts'
import { MIN_PASSWORD_LENGTH } from '../auth/password.ts'
import { Field, TextInput } from '../components/ui.tsx'
import { isLiveApi } from '../api/index.ts'

type Mode = 'signin' | 'signup'

export function SignIn() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<Mode>('signin')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const creating = mode === 'signup'
  const needsInvite = isLiveApi()
  const submitLabel = pending
    ? creating
      ? 'Creating account…'
      : 'Signing in…'
    : creating
      ? 'Create account'
      : 'Sign in'

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setPassword('')
    setInviteCode('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (creating && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`)
      return
    }

    setPending(true)
    try {
      if (creating) await signUp(username, password, inviteCode)
      else await signIn(username, password)
    } catch (err) {
      // Backend messages are already written for the person reading them.
      setError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setPending(false)
    }
  }

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
        <p className="mt-2 text-sm text-ink-soft">
          {creating
            ? 'Create an account to start tracking what you owe.'
            : 'Keep track of what you owe, and what’s left to pay.'}
        </p>

        <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
          <Field label="Username">
            <TextInput
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              required
            />
          </Field>
          <Field label="Password">
            <TextInput
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={creating ? 'new-password' : 'current-password'}
              required
            />
          </Field>
          {creating && needsInvite && (
            <Field label="Invite code">
              <TextInput
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
              />
            </Field>
          )}

          {error && <p className="text-sm text-overdue">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="mt-2 w-full rounded-lg bg-ink py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {submitLabel}
          </button>
        </form>

        <button
          type="button"
          onClick={() => switchMode(creating ? 'signin' : 'signup')}
          className="mt-5 text-sm text-ink-soft underline-offset-2 hover:text-ink hover:underline"
        >
          {creating ? 'I already have an account' : 'Create an account'}
        </button>
      </div>
    </div>
  )
}
