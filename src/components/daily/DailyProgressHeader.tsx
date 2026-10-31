import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import ProgressRing from './ProgressRing'

interface DailyProgressHeaderProps {
  completed: number
  total: number
  date: Date
  onOpenPlanDay?: () => void
}

export function DailyProgressHeader({
  completed,
  total,
  date,
  onOpenPlanDay,
}: DailyProgressHeaderProps) {
  const allDone = total > 0 && completed === total

  return (
    <div className="sticky top-0 z-20 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 px-4 pt-[env(safe-area-inset-top)] pb-3.5 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ProgressRing completed={completed} total={total} size={54} strokeWidth={5} />
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 capitalize">
              {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
            <motion.p
              key={allDone ? 'done' : 'progress'}
              initial={{ opacity: 0, y: -2 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-base font-bold text-gray-900 dark:text-white tracking-tight"
            >
              {allDone ? '🎉 All complete!' : `${completed} of ${total} done`}
            </motion.p>
          </div>
        </div>

        {onOpenPlanDay && (
          <button
            type="button"
            onClick={onOpenPlanDay}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-semibold border border-indigo-200/60 dark:border-indigo-800/40 transition-colors shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Open Plan My Day"
          >
            <Sparkles size={14} className="text-indigo-600 dark:text-indigo-400" />
            <span>Plan my day</span>
          </button>
        )}
      </div>
    </div>
  )
}
