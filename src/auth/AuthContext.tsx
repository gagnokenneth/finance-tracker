import { createContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import { getApi } from '../api/index.ts'
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

  const signIn = useCallback(async (username: string, password: string) => {
    const derived = await deriveCredential(username, password)
    const result = await getApi().login({ username, derived })
    writeToken(result.token)
    setUser(result.user)
  }, [])

  const signUp = useCallback(
    async (username: string, password: string, inviteCode: string) => {
      const derived = await deriveCredential(username, password)
      const result = await getApi().signup({ username, derived, invite_code: inviteCode })
      writeToken(result.token)
      setUser(result.user)
    },
    [],
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
