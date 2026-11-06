import { useNavigate, type NavigateOptions, type To } from 'react-router-dom'

/**
 * Safe navigate hook that returns standard useNavigate() if within a <Router>,
 * or a safe fallback function if rendered outside of a router context (e.g. isolated unit tests).
 */
export function useSafeNavigate() {
  try {
    return useNavigate()
  } catch {
    return (to: To | number, _options?: NavigateOptions) => {
      if (typeof window !== 'undefined' && typeof to === 'string') {
        window.location.href = to
      }
    }
  }
}
