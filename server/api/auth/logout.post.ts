export default defineEventHandler(async (event) => {
  const user = await resolveSessionUser(event)
  if (user) {
    await recordAudit(useDb(), {
      userId: user.id,
      action: 'LOGOUT',
      entityType: 'SESSION',
      description: `${user.displayName} signed out`,
    })
  }
  deleteCookie(event, SESSION_COOKIE_NAME, { path: '/' })
  return { authenticated: false }
})
