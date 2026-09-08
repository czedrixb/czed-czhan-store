export default defineEventHandler(async (event) => {
  const body = await readBody<{ pin?: string }>(event)
  const pin = body?.pin

  if (!pin || typeof pin !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'PIN is required' })
  }

  const config = useRuntimeConfig()
  if (!config.storePinHash) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Server is not configured with a store PIN (STORE_PIN_HASH is unset)',
    })
  }

  if (!verifyPin(pin, config.storePinHash)) {
    throw createError({ statusCode: 401, statusMessage: 'Incorrect PIN' })
  }

  const token = createSessionToken(config.sessionSecret)
  setCookie(event, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 30 * 24 * 60 * 60,
  })

  return { authenticated: true }
})
