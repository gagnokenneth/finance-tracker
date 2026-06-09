import { useContext } from 'react'
import { AuthContext } from './AuthContext.tsx'
import type { AuthState } from './AuthContext.tsx'

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
