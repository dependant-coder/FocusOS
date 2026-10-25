import { motion } from 'framer-motion'
import type { WeeklyReview } from '../../types'

export function WeekSummaryCard({ review }: { review: WeeklyReview }) {
  const rate = review.completion_rate || 0
  const isGood = rate >= 70
  const isOk = rate >= 40 && rate < 70

  const badgeColor = isGood
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    : isOk
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'

  const startDate = new Date(review.week_start)
  const endDate = new Date(startDate.getTime() + 6 * 86400000)

  const dateRange = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm"
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Week Summary</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{dateRange}</p>
        </div>
        <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${badgeColor}`}>
          {rate}%
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{review.tasks_completed}</p>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Completed</p>
        </div>
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{review.tasks_missed}</p>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mt-1">Missed</p>
        </div>
      </div>
    </motion.div>
  )
}
