import type { SessionResponse } from '~/types'

const FRESH_FOR_MS = 60_000

/**
 * Hydrated application state, deliberately not module state: SSR requests and
 * browser users must never share a session or an in-flight validation.
 */
export function useSession() {
  const session = useState<SessionResponse | null>('session:data', () => null)
  const fetchedAt = useState<number>('session:fetched-at', () => 0)
  const pending = useState<Promise<SessionResponse> | null>('session:pending', () => null)

  function set(value: SessionResponse | null) {
    session.value = value
    fetchedAt.value = value ? Date.now() : 0
  }

  function clear() {
    session.value = null
    fetchedAt.value = 0
    pending.value = null
  }

  async function load(options: { force?: boolean } = {}) {
    if (!options.force && session.value && Date.now() - fetchedAt.value < FRESH_FOR_MS) return session.value
    if (pending.value) return pending.value

    const requestFetch = useRequestFetch()
    const request = requestFetch<SessionResponse>('/api/auth/session')
      .then((value) => {
        set(value)
        return value
      })
      .catch((error) => {
        clear()
        throw error
      })
      .finally(() => { pending.value = null })
    pending.value = request
    return request
  }

  return { session, load, set, clear }
}
