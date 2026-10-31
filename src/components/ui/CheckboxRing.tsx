import { motion, AnimatePresence } from 'framer-motion'
import { PRIORITY_CONFIG } from '../../lib/constants'

interface CheckboxRingProps {
  checked: boolean
  onChange: (checked: boolean) => void
  priority?: 'critical' | 'high' | 'medium' | 'low'
  label?: string
}

export function CheckboxRing({
  checked,
  onChange,
  priority = 'medium',
  label,
}: CheckboxRingProps) {
  const color = PRIORITY_CONFIG[priority]?.color || '#eab308'

  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label || (checked ? 'Mark incomplete' : 'Mark complete')}
      onClick={() => onChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          onChange(!checked)
        }
      }}
      className="relative w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900"
      style={{ borderColor: checked ? color : 'currentColor' }}
      whileTap={{ scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
    >
      {/* Fill circle on check */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: color }}
        initial={false}
        animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />

      {/* Checkmark */}
      <AnimatePresence>
        {checked && (
          <motion.svg
            className="relative z-10 w-3 h-3 text-white"
            viewBox="0 0 12 12"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            exit={{ pathLength: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <motion.path
              d="M2 6l3 3 5-5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </motion.svg>
        )}
      </AnimatePresence>

      {/* Burst particles on completion */}
      <AnimatePresence>
        {checked && (
          <>
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <motion.div
                key={deg}
                className="absolute w-1 h-1 rounded-full"
                style={{ backgroundColor: color }}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                animate={{
                  x: Math.cos((deg * Math.PI) / 180) * 14,
                  y: Math.sin((deg * Math.PI) / 180) * 14,
                  opacity: 0,
                  scale: 0,
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            ))}
          </>
        )}
      </AnimatePresence>
    </motion.button>
  )
}
