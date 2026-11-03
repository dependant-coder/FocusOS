import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { useHabitHeatmap, type AnalyticsRange } from '../../hooks/useAnalytics'
import { ExternalLink } from 'lucide-react'

export function HabitHeatmap({ rangeDays = 30 }: { rangeDays?: AnalyticsRange }) {
  const { data: habits, isLoading } = useHabitHeatmap(rangeDays)

  if (isLoading || !habits) {
    return <div className="h-44 bg-gray-100 dark:bg-gray-800/60 animate-pulse rounded-2xl" />
  }

  if (habits.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">No active habits found to track.</p>
        <Link
          to="/habits"
          className="inline-block mt-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          Create your first habit →
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 shadow-2xs overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">
            Habit Consistency ({rangeDays} Days)
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Frequency-aware completion grid
          </p>
        </div>
        <Link
          to="/habits"
          className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1"
        >
          <span>View habits</span>
          <ExternalLink size={12} />
        </Link>
      </div>

      <div className="overflow-x-auto pb-1">
        <div className="min-w-[340px] space-y-3">
          {habits.map((habit, habitIdx) => (
            <div key={habit.id} className="flex items-center gap-3">
              <Link
                to="/habits"
                className="flex items-center gap-2 w-32 shrink-0 group hover:opacity-80 transition-opacity"
                title={`Open ${habit.name} details`}
              >
                <span className="text-base select-none">{habit.icon}</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                  {habit.name}
                </span>
              </Link>

              <div className="flex-1 flex items-center gap-1 overflow-hidden">
                {habit.days.map((day, i) => {
                  let bgClass = 'bg-gray-200 dark:bg-gray-700'
                  let label = 'Missed'

                  if (!day.isDue) {
                    bgClass = 'bg-gray-100/60 dark:bg-gray-800/40 border border-gray-200/50 dark:border-gray-800/60'
                    label = 'Not scheduled'
                  } else if (day.completed) {
                    bgClass = 'bg-emerald-500 shadow-2xs shadow-emerald-500/20'
                    label = 'Completed'
                  }

                  return (
                    <motion.div
                      key={day.date}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(0.2, i * 0.005 + habitIdx * 0.03) }}
                      className={`h-3 flex-1 min-w-[5px] max-w-[14px] rounded-xs ${bgClass}`}
                      title={`${day.date}: ${label}`}
                      aria-label={`${habit.name} on ${day.date}: ${label}`}
                    />
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-gray-100 dark:border-gray-800/60 text-[11px] text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-xs bg-emerald-500" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-xs bg-gray-200 dark:bg-gray-700" />
          <span>Missed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-xs bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700" />
          <span>Rest day</span>
        </div>
      </div>
    </div>
  )
}
