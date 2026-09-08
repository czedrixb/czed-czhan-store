export default defineEventHandler((event) => {
  const config = useRuntimeConfig()
  const token = getCookie(event, SESSION_COOKIE_NAME)
  return { authenticated: verifySessionToken(token, config.sessionSecret) }
})
