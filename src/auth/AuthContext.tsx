import { createContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import { getApi } from '../api/index.ts'
import type { AuthResult } from '../api/FinanceApi.ts'
import { deriveCredential } from './password.ts'
import {
  AUTH_EXPIRED_EVENT,
  clearToken,
  decodeSession,
  readToken,
  writeToken,
} from './session.ts'

export interface AuthUser {
  id: number
  username: string
}

export interface AuthState {
  user: AuthUser | null
  signIn: (username: string, password: string) => Promise<void>
  signUp: (username: string, password: string, inviteCode: string) => Promise<void>
  signOut: () => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  // Restore the session during init (pure) — never setState in an effect.
  const [user, setUser] = useState<AuthUser | null>(() => decodeSession(readToken()))

  /**
   * Signing in and signing up differ only in which call they make. Sharing the
   * surrounding steps keeps them from drifting — both must derive, then call,
   * then store the token, then set the user, in that order.
   */
  const authenticate = useCallback(
    async (username: string, password: string, call: (derived: string) => Promise<AuthResult>) => {
      const derived = await deriveCredential(username, password)
      const result = await call(derived)
      writeToken(result.token)
      setUser(result.user)
    },
    [],
  )

  const signIn = useCallback(
    (username: string, password: string) =>
      authenticate(username, password, (derived) => getApi().login({ username, derived })),
    [authenticate],
  )

  const signUp = useCallback(
    (username: string, password: string, inviteCode: string) =>
      authenticate(username, password, (derived) =>
        getApi().signup({ username, derived, invite_code: inviteCode }),
      ),
    [authenticate],
  )

  const signOut = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  // The API layer clears the token when the backend rejects it; this returns the
  // UI to the sign-in screen. Only clearing state, which the lint rule allows.
  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [])

  return (
    <AuthContext.Provider value={{ user, signIn, signUp, signOut }}>{children}</AuthContext.Provider>
  )
}
