const PUBLIC_PREFIXES = ['/api/auth/']

export default defineEventHandler((event) => {
  const path = event.path.split('?')[0]
  if (!path.startsWith('/api/')) return
  if (PUBLIC_PREFIXES.some((p) => path.startsWith(p))) return

  const config = useRuntimeConfig()
  const token = getCookie(event, SESSION_COOKIE_NAME)
  if (!verifySessionToken(token, config.sessionSecret)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
})
