const CHANGE_PASSWORD_PATH = '/settings/password'

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  const { load } = useSession()
  let session
  try {
    session = await load()
  } catch {
    return navigateTo('/login')
  }
  if (!session.authenticated || !session.user) return navigateTo('/login')

  if (session.user.mustChangePassword && to.path !== CHANGE_PASSWORD_PATH) {
    return navigateTo(CHANGE_PASSWORD_PATH)
  }
})
