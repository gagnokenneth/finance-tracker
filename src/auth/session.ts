const KEY = 'finance-session'

/** Dispatched when the stored token is cleared, so the UI can return to sign-in. */
export const AUTH_EXPIRED_EVENT = 'finance-auth-expired'

export interface SessionUser {
  id: number
  username: string
}

export function readToken(): string | null {
  return localStorage.getItem(KEY)
}

export function writeToken(token: string): void {
  localStorage.setItem(KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(KEY)
  // The API layer clears the token when the backend rejects it; without this
  // event the UI would keep rendering as though still signed in.
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
}

/**
 * Reads the display fields out of the token payload. This is NOT verification —
 * the signature is checked by the backend on every request. It only avoids a
 * round trip to render who is signed in after a reload.
 */
export function decodeSession(token: string | null): SessionUser | null {
  if (!token) return null
  const payload = token.split('.')[0]
  if (!payload) return null
  try {
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const parsed = JSON.parse(json) as { uid?: number; username?: string }
    if (typeof parsed.uid !== 'number' || !parsed.username) return null
    return { id: parsed.uid, username: parsed.username }
  } catch {
    return null
  }
}
