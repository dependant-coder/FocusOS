import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-amber-600 text-white text-xs font-medium px-4 py-2 flex items-center justify-center gap-2 sticky top-0 z-50 shadow-md"
        >
          <WifiOff size={14} className="shrink-0 animate-pulse" />
          <span>You&apos;re offline — changes are saved locally and will sync when reconnected.</span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
