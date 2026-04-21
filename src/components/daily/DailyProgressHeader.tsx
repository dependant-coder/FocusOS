import { motion } from 'framer-motion'

export function DailyProgressHeader({
  completed,
  total,
  date,
}: {
  completed: number
  total: number
  date: Date
}) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0
  const allDone = total > 0 && completed === total

  return (
    <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 px-4 pt-[env(safe-area-inset-top)] pb-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </p>
          <motion.p
            key={allDone ? 'done' : 'progress'}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-base font-semibold text-gray-900 dark:text-white"
          >
            {allDone ? '🎉 All done!' : `${completed} of ${total} done`}
          </motion.p>
        </div>
        <motion.span
          key={pct}
          animate={{ scale: [1.1, 1] }}
          transition={{ duration: 0.2 }}
          className="text-2xl font-bold text-brand-500"
        >
          {pct}%
        </motion.span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
        />
      </div>

      {/* Confetti burst when 100% */}
      {allDone && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 2, duration: 0.5 }}
          className="absolute inset-0 pointer-events-none"
          // We can wire confetti library here later if 'canvas-confetti' is added
        />
      )}
    </div>
  )
}
