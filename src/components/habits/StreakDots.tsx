import { todayLocal, addDaysLocal } from '../../lib/dates'
import { isHabitDue, type HabitLike } from '../../lib/habits'

interface StreakDotsProps {
  /** Dates on which the habit was completed (YYYY-MM-DD format) */
  completedDates: string[]
  /** Habit reference to evaluate frequency and due days */
  habit?: HabitLike
  /** Number of days to show (default 7) */
  days?: number
}

export default function StreakDots({ completedDates, habit, days = 7 }: StreakDotsProps) {
  const todayStr = todayLocal()
  const completedSet = new Set(completedDates)

  const dots = Array.from({ length: days }, (_, i) => {
    const offset = -(days - 1 - i)
    const dateStr = addDaysLocal(todayStr, offset)
    const isFuture = offset > 0
    const isCompleted = completedSet.has(dateStr)
    const isToday = dateStr === todayStr
    const isDue = habit ? isHabitDue(habit, dateStr) : true

    return { dateStr, isFuture, isCompleted, isToday, isDue }
  })

  return (
    <div className="flex items-center gap-1" aria-label="Last 7 days completion history">
      {dots.map((dot) => {
        let dotStyle = ''
        let title = dot.dateStr

        if (dot.isFuture) {
          dotStyle = 'bg-gray-100 dark:bg-gray-800 opacity-30'
        } else if (!dot.isDue) {
          // Frequency-aware: Greyed out for not-due days
          dotStyle = 'bg-gray-200/60 dark:bg-gray-800/60'
          title += ' · Not scheduled'
        } else if (dot.isCompleted) {
          dotStyle = 'bg-emerald-500 shadow-xs shadow-emerald-500/30'
          title += ' · Completed ✓'
        } else if (dot.isToday) {
          dotStyle = 'border-2 border-indigo-500 dark:border-indigo-400'
          title += ' · Due today'
        } else {
          dotStyle = 'border border-gray-300 dark:border-gray-600'
          title += ' · Missed'
        }

        return (
          <div
            key={dot.dateStr}
            className={`w-2.5 h-2.5 rounded-full transition-all ${dotStyle}`}
            title={title}
          />
        )
      })}
    </div>
  )
}
