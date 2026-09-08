export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const requestFetch = useRequestFetch()
  try {
    const session = await requestFetch<{ authenticated: boolean }>('/api/auth/session')
    if (!session.authenticated) return navigateTo('/login')
  } catch {
    return navigateTo('/login')
  }
})
