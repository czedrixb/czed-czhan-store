import type { SessionResponse } from '~/types'

export default defineNuxtRouteMiddleware(async () => {
  const requestFetch = useRequestFetch()
  try {
    const session = await requestFetch<SessionResponse>('/api/auth/session')
    if (session.user?.role !== 'ADMIN') return navigateTo('/settings')
  } catch {
    return navigateTo('/settings')
  }
})
