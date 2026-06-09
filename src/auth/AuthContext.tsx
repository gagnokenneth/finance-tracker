import { createContext, useState, useCallback, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { getToken, setToken, clearToken, AUTH_EXPIRED_EVENT } from './token.ts'
import { decodeJwt } from './googleJwt.ts'

export interface AuthUser {
  email: string
  name: string
}

export interface AuthState {
  user: AuthUser | null
  live: boolean
  signIn: () => void
  signOut: () => void
  renderButton: (el: HTMLElement | null) => void
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthState | null>(null)

const LIVE = import.meta.env.VITE_API_MODE === 'live'
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
const STUB_USER: AuthUser = { email: 'ken.gagno@vibeteams.ai', name: 'Ken' }

export function AuthProvider({ children }: { children: ReactNode }) {
  // Restore a still-valid token during init (pure) — never setState in the effect.
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (!LIVE) return null
    const existing = getToken()
    if (!existing) return null
    const p = decodeJwt(existing)
    if (p && p.exp * 1000 > Date.now()) return { email: p.email, name: p.name }
    return null
  })
  const buttonElRef = useRef<HTMLElement | null>(null)
  const initialized = useRef(false)

  const adoptToken = useCallback((token: string) => {
    const p = decodeJwt(token)
    if (!p || p.exp * 1000 <= Date.now()) {
      clearToken()
      setUser(null)
      return
    }
    setToken(token)
    setUser({ email: p.email, name: p.name })
  }, [])

  const signOut = useCallback(() => {
    clearToken()
    setUser(null)
    if (LIVE) window.google?.accounts.id.disableAutoSelect()
  }, [])

  const renderButton = useCallback((el: HTMLElement | null) => {
    buttonElRef.current = el
    if (el && window.google && initialized.current) {
      window.google.accounts.id.renderButton(el, { theme: 'outline', size: 'large' })
    }
  }, [])

  // Live mode: load GIS, listen for expiry. (Token restore happens in useState init.)
  useEffect(() => {
    if (!LIVE) return

    const onExpired = () => setUser(null)
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired)

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => {
      if (!window.google || !CLIENT_ID) return
      window.google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (resp) => adoptToken(resp.credential),
      })
      initialized.current = true
      if (buttonElRef.current) {
        window.google.accounts.id.renderButton(buttonElRef.current, {
          theme: 'outline',
          size: 'large',
        })
      }
    }
    document.head.appendChild(script)

    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired)
  }, [adoptToken])

  const signIn = useCallback(() => {
    if (LIVE) window.google?.accounts.id.prompt()
    else setUser(STUB_USER)
  }, [])

  return (
    <AuthContext.Provider value={{ user, live: LIVE, signIn, signOut, renderButton }}>
      {children}
    </AuthContext.Provider>
  )
}
