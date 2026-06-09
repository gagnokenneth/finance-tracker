export interface GooglePayload {
  email: string
  name: string
  exp: number // seconds since epoch
}

export function decodeJwt(token: string): GooglePayload | null {
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const p = JSON.parse(json) as { email?: string; name?: string; exp?: number }
    if (!p.email || !p.exp) return null
    return { email: p.email, name: p.name ?? p.email, exp: p.exp }
  } catch {
    return null
  }
}
