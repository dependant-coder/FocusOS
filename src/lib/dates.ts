import {
  isToday,
  isTomorrow,
  isPast,
  differenceInDays,
  format,
  startOfWeek,
  endOfWeek,
  getDayOfYear,
  subDays,
  addDays,
} from 'date-fns'

export { isToday, isTomorrow, isPast, differenceInDays, format, startOfWeek, endOfWeek, getDayOfYear, subDays, addDays }

/** Get today's date as YYYY-MM-DD string */
export function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

/** Get yesterday's date as YYYY-MM-DD string */
export function yesterdayString(): string {
  return subDays(new Date(), 1).toISOString().split('T')[0]
}

/** Format a date for display: "Mon, Apr 19" */
export function formatShortDate(date: string | Date): string {
  return format(new Date(date), 'EEE, MMM d')
}

/** Format full date: "Saturday, April 19, 2026" */
export function formatFullDate(date: string | Date): string {
  return format(new Date(date), 'EEEE, MMMM d, yyyy')
}

/** Get the date chip label for a due date */
export function getDateLabel(dateStr: string | null): string | null {
  if (!dateStr) return null
  const date = new Date(dateStr + 'T00:00:00')
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isPast(date)) return 'Overdue'
  const days = differenceInDays(date, new Date())
  if (days <= 7) return `In ${days} days`
  return format(date, 'MMM d')
}

/** Get greeting based on time of day */
export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

/** Get last 7 dates as YYYY-MM-DD strings */
export function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    subDays(new Date(), 6 - i).toISOString().split('T')[0]
  )
}
