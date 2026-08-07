const KEY = 'finance-mock-user'

export interface MockUser {
  email: string
  name: string
}

/**
 * Mock mode has no real token to restore, so the stub session is persisted
 * here instead. Without this, every reload drops you back to the sign-in
 * screen because the stub user only ever lived in React state.
 */
export function readMockUser(): MockUser | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<MockUser>
    if (!parsed.email || !parsed.name) return null
    return { email: parsed.email, name: parsed.name }
  } catch {
    return null
  }
}

export function writeMockUser(user: MockUser): void {
  localStorage.setItem(KEY, JSON.stringify(user))
}

export function clearMockUser(): void {
  localStorage.removeItem(KEY)
}
