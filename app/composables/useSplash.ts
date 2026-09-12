// Cross-page singleton (same useState pattern as useSession/useCart) so the
// splash, once dismissed, never remounts on ordinary in-app navigation - only
// a fresh launch or full reload creates a new dismissed:false state.
export function useSplash() {
  const dismissed = useState<boolean>('splash:dismissed', () => false)
  const failed = useState<boolean>('splash:failed', () => false)

  function dismiss() {
    dismissed.value = true
  }

  function fail() {
    failed.value = true
  }

  function retry() {
    if (import.meta.client) window.location.reload()
  }

  return { dismissed, failed, dismiss, fail, retry }
}
