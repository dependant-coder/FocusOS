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

/** Format Date to YYYY-MM-DD in local time */
export function localDateString(d: Date = new Date()): string {
  return format(d, 'yyyy-MM-dd')
}

/** Get today's local date as YYYY-MM-DD string */
export function todayLocal(): string {
  return localDateString()
}

/** Parse YYYY-MM-DD string into local midnight Date object */
export function parseLocalDate(str: string): Date {
  return new Date(`${str}T00:00:00`)
}

/** Add n days to a local YYYY-MM-DD string and return YYYY-MM-DD */
export function addDaysLocal(str: string, n: number): string {
  const d = parseLocalDate(str)
  return format(addDays(d, n), 'yyyy-MM-dd')
}

/** Get the Monday start-of-week for a local YYYY-MM-DD string */
export function startOfWeekLocal(str: string): string {
  const d = parseLocalDate(str)
  return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd')
}

/** Get yesterday's local date as YYYY-MM-DD string */
export function yesterdayLocal(): string {
  return addDaysLocal(todayLocal(), -1)
}

/** Get last 7 local dates as YYYY-MM-DD strings ending with today */
export function getLast7Days(): string[] {
  const today = todayLocal()
  return Array.from({ length: 7 }, (_, i) => addDaysLocal(today, -(6 - i)))
}

/** Compatibility aliases */
export const todayString = todayLocal
export const yesterdayString = yesterdayLocal

/** Format a date for display: "Mon, Apr 19" */
export function formatShortDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseLocalDate(date) : date
  return format(d, 'EEE, MMM d')
}

/** Format full date: "Saturday, April 19, 2026" */
export function formatFullDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseLocalDate(date) : date
  return format(d, 'EEEE, MMMM d, yyyy')
}

/** Get the date chip label for a due date */
export function getDateLabel(dateStr: string | null): string | null {
  if (!dateStr) return null
  const date = parseLocalDate(dateStr)
  if (isToday(date)) return 'Today'
  if (isTomorrow(date)) return 'Tomorrow'
  if (isPast(date)) return 'Overdue'
  const today = parseLocalDate(todayLocal())
  const days = differenceInDays(date, today)
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
