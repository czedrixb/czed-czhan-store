export default defineEventHandler(async (event) => {
  deleteCookie(event, SESSION_COOKIE_NAME, { path: '/' })
  return { authenticated: false }
})
