import { todayLocal, addDaysLocal } from '../../lib/dates'

interface StreakDotsProps {
  /** Dates on which the habit was completed (YYYY-MM-DD format) */
  completedDates: string[]
  /** Number of days to show */
  days?: number
}

export default function StreakDots({ completedDates, days = 7 }: StreakDotsProps) {
  const todayStr = todayLocal()
  const completedSet = new Set(completedDates)

  const dots = Array.from({ length: days }, (_, i) => {
    const offset = -(days - 1 - i)
    const dateStr = addDaysLocal(todayStr, offset)
    const isFuture = offset > 0
    const isCompleted = completedSet.has(dateStr)
    const isToday = dateStr === todayStr

    return { dateStr, isFuture, isCompleted, isToday }
  })

  // Calculate current streak
  let streak = 0
  for (let i = dots.length - 1; i >= 0; i--) {
    if (dots[i].isCompleted) streak++
    else break
  }

  return (
    <div className="flex items-center gap-1">
      {dots.map((dot) => (
        <div
          key={dot.dateStr}
          className={`
            w-2.5 h-2.5 rounded-full transition-all
            ${dot.isFuture ? 'bg-gray-100 dark:bg-gray-800 opacity-30' : ''}
            ${dot.isCompleted ? 'bg-emerald-500 shadow-sm shadow-emerald-500/30' : ''}
            ${!dot.isCompleted && !dot.isFuture ? 'border border-gray-300 dark:border-gray-600' : ''}
            ${dot.isToday && !dot.isCompleted ? 'border-indigo-400 dark:border-indigo-500' : ''}
          `}
          title={`${dot.dateStr}${dot.isCompleted ? ' ✓' : ''}`}
        />
      ))}
      {streak > 0 && (
        <span className="ml-1 text-[10px] font-bold text-emerald-500">
          {streak}🔥
        </span>
      )}
    </div>
  )
}
