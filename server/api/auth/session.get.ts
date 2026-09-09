export default defineEventHandler(async (event) => {
  const user = await resolveSessionUser(event)
  return { authenticated: Boolean(user), user }
})
