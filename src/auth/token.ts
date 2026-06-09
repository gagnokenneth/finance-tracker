const KEY = 'finance-id-token'

/** Dispatched when the stored token is cleared (e.g. server says unauthorized). */
export const AUTH_EXPIRED_EVENT = 'finance-auth-expired'

export function getToken(): string | null {
  return localStorage.getItem(KEY)
}

export function setToken(token: string): void {
  localStorage.setItem(KEY, token)
}

export function clearToken(): void {
  localStorage.removeItem(KEY)
  window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT))
}
