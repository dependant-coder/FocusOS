/**
 * Shared date utilities for timezone-aware edge functions.
 * Compatible with Deno and Node.js environments.
 */

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
export type WeekdayShort = (typeof WEEKDAYS)[number]

/**
 * Get user's local date in YYYY-MM-DD format for a given IANA timezone.
 */
export function getUserLocalDate(timeZone = 'UTC', now: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    return formatter.format(now)
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now)
  }
}

/**
 * Get user's 3-letter day name ('sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat')
 */
export function getUserDayName(timeZone = 'UTC', now: Date = new Date()): WeekdayShort {
  try {
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'short' })
      .format(now)
      .toLowerCase()
      .slice(0, 3) as WeekdayShort
    return WEEKDAYS.includes(weekday) ? weekday : 'mon'
  } catch {
    return 'mon'
  }
}

/**
 * Get user's day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
 */
export function getUserDayOfWeek(timeZone = 'UTC', now: Date = new Date()): number {
  const name = getUserDayName(timeZone, now)
  const idx = WEEKDAYS.indexOf(name)
  return idx >= 0 ? idx : 0
}

/**
 * Get user's local hour (0-23)
 */
export function getUserHour(timeZone = 'UTC', now: Date = new Date()): number {
  try {
    const str = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false,
    }).format(now)
    const val = parseInt(str, 10)
    return isNaN(val) ? 0 : val === 24 ? 0 : val
  } catch {
    return now.getUTCHours()
  }
}

/**
 * Add or subtract days from a YYYY-MM-DD string.
 */
export function addDaysToDateString(dateStr: string, days: number): string {
  const parts = dateStr.split('-').map(Number)
  const year = parts[0]
  const month = parts[1]
  const day = parts[2]
  const d = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0))
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

/**
 * Get the last completed Monday-Sunday week range for a user.
 * If today is Monday in the user's timezone:
 * - weekStart: Monday of 7 days ago
 * - weekEnd: Sunday of yesterday (6 days after weekStart)
 * - nextWeekStart: Today Monday (7 days after weekStart)
 */
export function getLastCompletedWeekRange(timeZone = 'UTC', now: Date = new Date()): {
  weekStart: string
  weekEnd: string
  nextWeekStart: string
} {
  const localToday = getUserLocalDate(timeZone, now)
  const dayOfWeek = getUserDayOfWeek(timeZone, now) // 0=Sun, 1=Mon, ..., 6=Sat

  // Days since last completed Monday:
  // If today is Mon (1), last completed Monday was 7 days ago
  // If today is Sun (0), last completed Monday was 6 + 7 = 13 days ago (or current active week started 6 days ago)
  const daysSinceMonday = (dayOfWeek + 6) % 7 // Mon=0, Tue=1, ..., Sun=6
  const currentWeekMonday = addDaysToDateString(localToday, -daysSinceMonday)
  const lastWeekMonday = addDaysToDateString(currentWeekMonday, -7)
  const lastWeekSunday = addDaysToDateString(lastWeekMonday, 6)

  return {
    weekStart: lastWeekMonday,
    weekEnd: lastWeekSunday,
    nextWeekStart: currentWeekMonday,
  }
}

/**
 * Check if the current time in the user's timezone is inside the Monday review window (Monday 00:00 - 05:59).
 */
export function isWeeklyReviewWindow(timeZone = 'UTC', now: Date = new Date()): boolean {
  const day = getUserDayOfWeek(timeZone, now) // 0=Sun, 1=Mon, ..., 6=Sat
  const hour = getUserHour(timeZone, now)
  return day === 1 && hour < 6
}

/**
 * Returns the 7 days (Monday through Sunday) of a week starting on weekStart (YYYY-MM-DD).
 */
export function getDaysInWeek(weekStart: string): { dateStr: string; dayName: WeekdayShort }[] {
  const days: { dateStr: string; dayName: WeekdayShort }[] = []
  const weekdayNames: WeekdayShort[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
  for (let i = 0; i < 7; i++) {
    days.push({
      dateStr: addDaysToDateString(weekStart, i),
      dayName: weekdayNames[i],
    })
  }
  return days
}

/**
 * Convert a user-local date (YYYY-MM-DD 00:00:00 in timeZone) into the exact UTC Date.
 */
export function localMidnightToUtc(dateStr: string, timeZone = 'UTC'): Date {
  const parts = dateStr.split('-').map(Number)
  const approxUtc = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], 0, 0, 0))

  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  const p = dtf.formatToParts(approxUtc)
  const map: Record<string, number> = {}
  for (const item of p) {
    if (item.type !== 'literal') map[item.type] = parseInt(item.value, 10)
  }
  if (map.hour === 24) map.hour = 0
  const localTimeMs = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second)
  const offsetMs = localTimeMs - approxUtc.getTime()

  return new Date(approxUtc.getTime() - offsetMs)
}

/**
 * Convert a user-local date (YYYY-MM-DD 00:00:00 in timeZone) into an ISO string in UTC.
 */
export function localMidnightToUtcIso(dateStr: string, timeZone = 'UTC'): string {
  return localMidnightToUtc(dateStr, timeZone).toISOString()
}

export interface HabitForWeeklyReview {
  id: string
  frequency: string
  custom_days?: string[] | null
  created_at?: string | null
}

/**
 * Pure calculation of how many habit completions were due during a Monday-Sunday week.
 */
export function computeHabitsDueInWeek(
  habits: HabitForWeeklyReview[],
  weekDays: { dateStr: string; dayName: WeekdayShort }[]
): { totalDue: number; habitDueMap: Map<string, number> } {
  let totalDue = 0
  const habitDueMap = new Map<string, number>()

  for (const habit of habits) {
    let habitDueCount = 0
    const createdLocal = habit.created_at ? habit.created_at.slice(0, 10) : '2000-01-01'

    for (const { dateStr, dayName } of weekDays) {
      if (dateStr < createdLocal) continue

      const isWeekday = !['sat', 'sun'].includes(dayName)
      const isWeekend = ['sat', 'sun'].includes(dayName)

      const due =
        habit.frequency === 'daily' ||
        (habit.frequency === 'weekdays' && isWeekday) ||
        (habit.frequency === 'weekends' && isWeekend) ||
        (habit.frequency === 'custom' && habit.custom_days?.includes(dayName))

      if (due) {
        habitDueCount++
        totalDue++
      }
    }
    habitDueMap.set(habit.id, habitDueCount)
  }

  return { totalDue, habitDueMap }
}
