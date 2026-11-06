import { motion } from 'framer-motion'
import type { WeeklyReviewWithLive } from '../../hooks/useWeekly'
import { parseLocalDate, endOfWeekLocal, formatShortDate, format } from '../../lib/dates'
import { CheckCircle2, XCircle, Flame, ArrowRightLeft, Calendar, Timer } from 'lucide-react'

export function WeekSummaryCard({ review }: { review: WeeklyReviewWithLive }) {
  const rate = review.completion_rate || 0
  const isGood = rate >= 70
  const isOk = rate >= 40 && rate < 70

  const badgeColor = isGood
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
    : isOk
    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
    : 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800'

  const weekEnd = endOfWeekLocal(review.week_start)
  const dateRange = `${formatShortDate(review.week_start)} – ${formatShortDate(weekEnd)}`

  // Format best day name if available
  const bestDayLabel = review.bestDay
    ? format(parseLocalDate(review.bestDay), 'EEEE')
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 rounded-2xl p-5 border border-gray-200/80 dark:border-gray-800 shadow-2xs"
    >
      <div className="flex justify-between items-start mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Week Summary</h2>
            {review.isLive && (
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                Live
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
            <Calendar size={13} className="text-gray-400" />
            <span>{dateRange}</span>
          </p>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-bold ${badgeColor}`}>
          {rate}% Done
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        {/* Completed */}
        <div className="bg-gray-50/80 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5 mb-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 size={14} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Completed
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
            {review.tasks_completed ?? 0}
          </p>
        </div>

        {/* Missed */}
        <div className="bg-gray-50/80 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5 mb-1 text-red-500">
            <XCircle size={14} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Missed
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
            {review.tasks_missed ?? 0}
          </p>
        </div>

        {/* Habits */}
        <div className="bg-gray-50/80 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5 mb-1 text-amber-500">
            <Flame size={14} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Habits
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
            {review.habit_completion_rate ?? 0}%
            <span className="text-xs font-normal text-gray-400 ml-1">
              ({review.habits_done ?? 0}/{review.habits_due ?? 0})
            </span>
          </p>
        </div>

        {/* Focus Time */}
        <div className="bg-gray-50/80 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-1.5 mb-1 text-purple-600 dark:text-purple-400">
            <Timer size={14} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Focus Time
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
            {review.focus_minutes ?? 0}
            <span className="text-xs font-normal text-gray-400 ml-1">min</span>
          </p>
        </div>

        {/* Carried Over */}
        <div className="bg-gray-50/80 dark:bg-gray-800/40 rounded-xl p-3 border border-gray-100 dark:border-gray-800 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-1.5 mb-1 text-indigo-500">
            <ArrowRightLeft size={14} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Carried Over
            </span>
          </div>
          <p className="text-xl font-bold text-gray-900 dark:text-white tabular-nums">
            {review.carried_over_count ?? 0}
          </p>
        </div>
      </div>

      {bestDayLabel && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Most productive day:</span>
          <span className="font-semibold text-gray-800 dark:text-gray-200">{bestDayLabel}</span>
        </div>
      )}
    </motion.div>
  )
}
