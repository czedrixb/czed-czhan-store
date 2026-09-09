export default defineNuxtRouteMiddleware(async () => {
  const { load } = useSession()
  try {
    const session = await load()
    if (session.user?.role !== 'ADMIN') return navigateTo('/settings')
  } catch {
    return navigateTo('/settings')
  }
})
