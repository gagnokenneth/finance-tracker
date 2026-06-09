import { createContext, useState, useCallback } from 'react'
import type { ReactNode } from 'react'

export interface AuthUser {
  email: string
  name: string
}

export interface AuthState {
  user: AuthUser | null
  signIn: () => void
  signOut: () => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthState | null>(null)

const STUB_USER: AuthUser = { email: 'ken.gagno@vibeteams.ai', name: 'Ken' }

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const signIn = useCallback(() => setUser(STUB_USER), [])
  const signOut = useCallback(() => setUser(null), [])
  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
