import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto'

export const SESSION_COOKIE_NAME = 'sari_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(pin, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPin(pin: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) return false
  const candidate = scryptSync(pin, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  if (candidate.length !== expected.length) return false
  return timingSafeEqual(candidate, expected)
}

/** Stateless signed session token: no server-side session store needed. */
export function createSessionToken(secret: string): string {
  const expires = Date.now() + SESSION_TTL_MS
  const payload = `auth.${expires}`
  const signature = createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${signature}`
}

export function verifySessionToken(token: string | undefined | null, secret: string): boolean {
  if (!token) return false
  const parts = token.split('.')
  if (parts.length !== 3) return false
  const [tag, expiresRaw, signature] = parts
  if (tag !== 'auth') return false

  const payload = `${tag}.${expiresRaw}`
  const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex')
  const expectedBuf = Buffer.from(expectedSignature, 'hex')
  const actualBuf = Buffer.from(signature, 'hex')
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return false
  }

  const expires = Number(expiresRaw)
  return Number.isFinite(expires) && Date.now() < expires
}
