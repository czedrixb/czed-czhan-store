const PUBLIC_PREFIXES = ['/api/auth/']

export default defineEventHandler(async (event) => {
  const path = event.path.split('?')[0]
  if (!path.startsWith('/api/')) return
  if (PUBLIC_PREFIXES.some((p) => path.startsWith(p))) return

  const user = await resolveSessionUser(event)
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  event.context.user = user
})
