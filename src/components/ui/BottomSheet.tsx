import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export default function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-40"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.2}
            onDragEnd={(_e, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) {
                onClose()
              }
            }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-700 rounded-full" />
            </div>

            {/* Title */}
            {title && (
              <div className="px-5 pb-3 border-b border-gray-100 dark:border-gray-800">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-5 py-4 pb-safe">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
