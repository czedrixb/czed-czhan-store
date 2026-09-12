const CHANGE_PASSWORD_PATH = '/settings/password'

export default defineNuxtRouteMiddleware(async (to) => {
  if (to.path === '/login') return

  // Carries the intended destination through the login redirect so a fresh
  // launch or a bounced deep link (e.g. a splash-covered startup, or an
  // expired session) lands the user back where they meant to go.
  const loginWithRedirect = () => navigateTo({ path: '/login', query: { redirect: to.fullPath } })

  const { load } = useSession()
  let session
  try {
    session = await load()
  } catch {
    return loginWithRedirect()
  }
  if (!session.authenticated || !session.user) return loginWithRedirect()

  if (session.user.mustChangePassword && to.path !== CHANGE_PASSWORD_PATH) {
    return navigateTo(CHANGE_PASSWORD_PATH)
  }
})
