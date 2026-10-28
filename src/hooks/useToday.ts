import { useState, useEffect } from 'react'
import { todayLocal } from '../lib/dates'

/**
 * Hook that returns today's local date string (YYYY-MM-DD).
 * Automatically updates at local midnight and on visibilitychange (e.g. mobile PWA resume).
 */
export function useToday(): string {
  const [today, setToday] = useState(todayLocal)

  useEffect(() => {
    function updateToday() {
      const current = todayLocal()
      setToday((prev) => (prev !== current ? current : prev))
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        updateToday()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('focus', updateToday)

    // Schedule a timer for local midnight + 1 second
    let timerId: ReturnType<typeof setTimeout>
    function scheduleMidnightTimer() {
      const now = new Date()
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1)
      const msUntilMidnight = Math.max(1000, tomorrow.getTime() - now.getTime())
      timerId = setTimeout(() => {
        updateToday()
        scheduleMidnightTimer()
      }, msUntilMidnight)
    }

    scheduleMidnightTimer()

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('focus', updateToday)
      clearTimeout(timerId)
    }
  }, [])

  return today
}
