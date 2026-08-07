/**
 * Password hashing happens here, in the browser, because WebCrypto PBKDF2 is
 * native and fast. Apps Script offers only computeHmacSha256Signature, where a
 * 210k-iteration loop would take tens of seconds per login.
 *
 * The salt is derived from the username rather than random: the browser needs it
 * before it can hash, and fetching a random per-user salt would reveal which
 * usernames exist. Unique per user but predictable — the iteration count is what
 * carries the weight.
 *
 * The server never sees the password, and applies its own peppered digest to
 * what it receives, so a leaked spreadsheet yields nothing directly usable.
 */
const ITERATIONS = 210_000
const SITE = 'finance-tracker:'

export const MIN_PASSWORD_LENGTH = 10

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

export async function deriveCredential(username: string, password: string): Promise<string> {
  const enc = new TextEncoder()
  const salt = new Uint8Array(
    await crypto.subtle.digest('SHA-256', enc.encode(SITE + username.trim().toLowerCase())),
  )
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveBits',
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  )
  return toHex(new Uint8Array(bits))
}
