import { motion } from 'framer-motion'
import * as Icons from 'lucide-react'
import { useHabitHeatmapData } from '../../hooks/useAnalytics'

export function HabitHeatmap() {
  const { data: habits, isLoading } = useHabitHeatmapData()

  if (isLoading || !habits) {
    return <div className="h-40 bg-white/5 animate-pulse rounded-2xl" />
  }

  if (habits.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm text-center">
        <p className="text-gray-500 dark:text-gray-400">No active habits found.</p>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-x-auto">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Habit Consistency (30 Days)</h3>
      <div className="min-w-[500px]">
        {habits.map((habit, index) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const Icon = ((Icons as any)[habit.icon || 'Circle'] || Icons.Circle) as React.ElementType
          return (
            <div key={habit.id} className="flex items-center gap-4 mb-3 last:mb-0">
              <div className="flex items-center gap-2 w-32 flex-shrink-0">
                <Icon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-sm text-gray-700 dark:text-gray-300 truncate">{habit.name}</span>
              </div>
              <div className="flex-1 flex gap-1">
                {habit.days.map((day, i) => (
                  <motion.div
                    key={day.date}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.01 + index * 0.1 }}
                    className={`w-3 h-3 rounded-sm ${
                      day.completed ? 'bg-indigo-500' : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                    title={`${day.date}: ${day.completed ? 'Done' : 'Missed'}`}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
