export default defineEventHandler((event) => {
  deleteCookie(event, SESSION_COOKIE_NAME, { path: '/' })
  return { authenticated: false }
})
