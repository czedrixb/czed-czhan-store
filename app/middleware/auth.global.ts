import type { SessionResponse } from '~/types'

const CHANGE_PASSWORD_PATH = '/settings/password'

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const requestFetch = useRequestFetch()
  let session: SessionResponse
  try {
    session = await requestFetch<SessionResponse>('/api/auth/session')
  } catch {
    return navigateTo('/login')
  }
  if (!session.authenticated || !session.user) return navigateTo('/login')

  if (session.user.mustChangePassword && to.path !== CHANGE_PASSWORD_PATH) {
    return navigateTo(CHANGE_PASSWORD_PATH)
  }
})
