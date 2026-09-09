import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'node:crypto'

export const SESSION_COOKIE_NAME = 'sari_session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) return false
  const candidate = scryptSync(password, salt, 64)
  const expected = Buffer.from(hash, 'hex')
  if (candidate.length !== expected.length) return false
  return timingSafeEqual(candidate, expected)
}

/** Stateless signed session token: no server-side session store needed. */
export function createSessionToken(secret: string, userId: number): string {
  const expires = Date.now() + SESSION_TTL_MS
  const payload = `auth.${userId}.${expires}`
  const signature = createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}.${signature}`
}

export function verifySessionToken(token: string | undefined | null, secret: string): number | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 4) return null
  const [tag, userIdRaw, expiresRaw, signature] = parts
  if (tag !== 'auth') return null

  const payload = `${tag}.${userIdRaw}.${expiresRaw}`
  const expectedSignature = createHmac('sha256', secret).update(payload).digest('hex')
  const expectedBuf = Buffer.from(expectedSignature, 'hex')
  const actualBuf = Buffer.from(signature, 'hex')
  if (expectedBuf.length !== actualBuf.length || !timingSafeEqual(expectedBuf, actualBuf)) {
    return null
  }

  const expires = Number(expiresRaw)
  const userId = Number(userIdRaw)
  return Number.isInteger(userId) && userId > 0 && Number.isFinite(expires) && Date.now() < expires
    ? userId
    : null
}

// Kept for the existing CLI while deployments move from STORE_PIN_HASH.
export const hashPin = hashPassword
export const verifyPin = verifyPassword
