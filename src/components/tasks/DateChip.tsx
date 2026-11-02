import { isToday, isTomorrow, isPast, differenceInDays } from 'date-fns'
import { parseLocalDate, todayLocal } from '../../lib/dates'

interface DateChipProps {
  date: string | null | undefined
  dueTime?: string | null
  className?: string
}

export default function DateChip({ date, dueTime, className = '' }: DateChipProps) {
  if (!date) return null

  const parsed = parseLocalDate(date)
  const today = parseLocalDate(todayLocal())

  let label: string
  let classes: string

  if (isToday(parsed)) {
    label = 'Today'
    classes = 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20'
  } else if (isTomorrow(parsed)) {
    label = 'Tomorrow'
    classes = 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20'
  } else if (isPast(parsed) && !isToday(parsed)) {
    const daysAgo = differenceInDays(today, parsed)
    label = daysAgo === 1 ? 'Yesterday' : `${daysAgo}d overdue`
    classes = 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'
  } else {
    const daysAway = differenceInDays(parsed, today)
    label = `In ${daysAway}d`
    classes = 'bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20'
  }

  const timeFormatted = dueTime ? dueTime.slice(0, 5) : null
  const displayLabel = timeFormatted ? `${label} · ${timeFormatted}` : label

  return (
    <span className={`inline-flex items-center text-[10px] font-medium rounded-full px-1.5 py-0.5 border ${classes} ${className}`}>
      {displayLabel}
    </span>
  )
}
