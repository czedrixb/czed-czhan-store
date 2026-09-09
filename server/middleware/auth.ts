const PUBLIC_PREFIXES = ['/api/auth/']
const ADMIN_BASES = ['/api/users', '/api/audit']
const PASSWORD_CHANGE_ALLOWED = ['/api/account/password']

const isUnder = (path: string, base: string) => path === base || path.startsWith(`${base}/`)

export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0]
  if (!path.startsWith('/api/')) return
  if (PUBLIC_PREFIXES.some((p) => path.startsWith(p))) return

  const user = await resolveSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  if (user.mustChangePassword && !PASSWORD_CHANGE_ALLOWED.includes(path)) {
    throw createError({ statusCode: 403, statusMessage: 'Password change required' })
  }

  if (ADMIN_BASES.some((base) => isUnder(path, base)) && user.role !== 'ADMIN') {
    throw createError({ statusCode: 403, statusMessage: 'Admin access required' })
  }

  event.context.user = user
})
