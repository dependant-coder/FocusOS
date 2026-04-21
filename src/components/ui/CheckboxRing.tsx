import { motion, AnimatePresence } from 'framer-motion'

interface CheckboxRingProps {
  checked: boolean
  onChange: (checked: boolean) => void
  priority?: 'critical' | 'high' | 'medium' | 'low'
}

const priorityColors = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
}

export function CheckboxRing({ checked, onChange, priority = 'medium' }: CheckboxRingProps) {
  const color = priorityColors[priority]

  return (
    <motion.button
      onClick={() => onChange(!checked)}
      className="relative w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2"
      style={{ borderColor: checked ? color : '#d1d5db' }}
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
