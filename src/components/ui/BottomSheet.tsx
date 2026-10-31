import { useEffect, useRef, useId, type ReactNode } from 'react'
import { motion, AnimatePresence, type PanInfo } from 'framer-motion'
import { X } from 'lucide-react'

export interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  footer?: ReactNode
  maxWidth?: string
  ariaLabel?: string
}

export default function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  footer,
  maxWidth = 'max-w-lg',
  ariaLabel,
}: BottomSheetProps) {
  const generatedId = useId()
  const titleId = `sheet-title-${generatedId}`
  const sheetRef = useRef<HTMLDivElement>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  // Focus restoration & body scroll lock
  useEffect(() => {
    if (isOpen) {
      previousActiveElementRef.current = document.activeElement as HTMLElement

      // iOS safe scroll lock
      const originalOverflow = document.body.style.overflow
      const originalTouchAction = document.body.style.touchAction
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'

      // Focus the sheet or first focusable element
      const timer = setTimeout(() => {
        if (!sheetRef.current) return
        const focusables = sheetRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length > 0) {
          // Focus first input if available, else first focusable
          const firstInput = Array.from(focusables).find((el) =>
            ['INPUT', 'TEXTAREA'].includes(el.tagName)
          )
          if (firstInput) {
            firstInput.focus()
          } else {
            focusables[0].focus()
          }
        } else {
          sheetRef.current.focus()
        }
      }, 50)

      return () => {
        clearTimeout(timer)
        document.body.style.overflow = originalOverflow
        document.body.style.touchAction = originalTouchAction
        if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
          previousActiveElementRef.current.focus()
        }
      }
    }
  }, [isOpen])

  // Keyboard navigation: Escape to close & focus trapping
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }

      if (e.key === 'Tab' && sheetRef.current) {
        const focusables = sheetRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return

        const firstElement = focusables[0]
        const lastElement = focusables[focusables.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Drag-to-dismiss handler
  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 100 || info.velocity.y > 400) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={!title ? ariaLabel || 'Bottom Sheet Dialog' : undefined}
            tabIndex={-1}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={handleDragEnd}
            dragListener={false} // Only drag handle initiates drag
            className={`fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-gray-900 rounded-t-3xl pb-[env(safe-area-inset-bottom)] max-h-[92dvh] flex flex-col mx-auto shadow-2xl border-t border-gray-100 dark:border-gray-800 ${maxWidth}`}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 40 }}
          >
            {/* Drag Handle Bar */}
            <motion.div
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={{ top: 0, bottom: 0.6 }}
              onDragEnd={handleDragEnd}
              className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing touch-none select-none w-full"
              aria-label="Drag to dismiss sheet"
            >
              <div className="w-12 h-1.5 rounded-full bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600 transition-colors" />
            </motion.div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-5 pb-3 pt-1 border-b border-gray-100 dark:border-gray-800/80 shrink-0">
                <h2
                  id={titleId}
                  className="text-base font-semibold text-gray-900 dark:text-white tracking-tight"
                >
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 -mr-1 rounded-full text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  aria-label="Close dialog"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Scrollable Content Body */}
            <div className="overflow-y-auto flex-1 overscroll-contain px-5 py-4 focus:outline-none">
              {children}
            </div>

            {/* Sticky Footer Slot */}
            {footer && (
              <div className="shrink-0 px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
