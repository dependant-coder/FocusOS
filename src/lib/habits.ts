import { addDaysLocal, parseLocalDate, todayLocal } from './dates'

export interface HabitLike {
  id?: string
  name?: string
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom' | string
  custom_days?: string[] | null
  created_at?: string | null
}

const WEEKDAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

/**
 * Check if a habit is due on a given local date (YYYY-MM-DD).
 * Accounts for frequency, custom_days, and habit.created_at.
 */
export function isHabitDue(habit: HabitLike, dateStr: string): boolean {
  if (habit.created_at) {
    const createdLocal = habit.created_at.slice(0, 10)
    if (dateStr < createdLocal) return false
  }

  const d = parseLocalDate(dateStr)
  const dayIndex = d.getDay() // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const dayName = WEEKDAY_NAMES[dayIndex]
  const isWeekday = dayIndex >= 1 && dayIndex <= 5
  const isWeekend = dayIndex === 0 || dayIndex === 6

  switch (habit.frequency) {
    case 'daily':
      return true
    case 'weekdays':
      return isWeekday
    case 'weekends':
      return isWeekend
    case 'custom': {
      if (!habit.custom_days || habit.custom_days.length === 0) return false
      const normalized = habit.custom_days.map((c) => c.toLowerCase().slice(0, 3))
      return normalized.includes(dayName)
    }
    default:
      return true
  }
}

export interface StreakResult {
  streak: number
  graceUsed: number
}

export interface StreakOptions {
  graceDays?: number
  maxLookbackDays?: number
}

/**
 * Calculate current streak walking backwards over DUE days only.
 * - If today is due and not completed, starts from the previous due day (does not break).
 * - Allows graceDays per rolling period (default 1).
 */
export function currentStreak(
  habit: HabitLike,
  completedDates: Set<string> | string[],
  todayStr: string,
  opts: StreakOptions = {}
): StreakResult {
  const completedSet = completedDates instanceof Set ? completedDates : new Set(completedDates)
  const graceLimit = opts.graceDays ?? 1
  const maxLookback = opts.maxLookbackDays ?? 365

  let cursor = todayStr
  const todayDue = isHabitDue(habit, cursor)
  const todayCompleted = completedSet.has(cursor)

  // If today is due and not completed yet, start from previous due day without resetting streak
  if (todayDue && !todayCompleted) {
    cursor = addDaysLocal(cursor, -1)
  }

  let streak = 0
  let graceUsed = 0
  let daysChecked = 0

  while (daysChecked < maxLookback) {
    if (habit.created_at && cursor < habit.created_at.slice(0, 10)) {
      break
    }

    if (isHabitDue(habit, cursor)) {
      if (completedSet.has(cursor)) {
        streak++
      } else {
        // Due day was missed
        if (graceUsed < graceLimit && streak > 0) {
          graceUsed++
          // Grace absorbs this miss, continue checking prior due days
        } else {
          // No more grace or broke streak at start
          break
        }
      }
    }

    cursor = addDaysLocal(cursor, -1)
    daysChecked++
  }

  return { streak, graceUsed }
}

/**
 * Calculate longest streak across history walking over due days only.
 */
export function longestStreak(
  habit: HabitLike,
  completedDates: Set<string> | string[],
  fromStr?: string,
  toStr?: string
): number {
  const completedSet = completedDates instanceof Set ? completedDates : new Set(completedDates)
  const start = fromStr || (habit.created_at ? habit.created_at.slice(0, 10) : '2024-01-01')
  const end = toStr || todayLocal()

  let maxStreak = 0
  let currentRun = 0
  let cursor = start

  while (cursor <= end) {
    if (isHabitDue(habit, cursor)) {
      if (completedSet.has(cursor)) {
        currentRun++
        if (currentRun > maxStreak) {
          maxStreak = currentRun
        }
      } else {
        currentRun = 0
      }
    }
    cursor = addDaysLocal(cursor, 1)
  }

  return maxStreak
}

/**
 * Calculate completion rate percentage (0-100) across a date range [fromStr, toStr].
 * Evaluates completed due days / total due days.
 */
export function completionRate(
  habit: HabitLike,
  completedDates: Set<string> | string[],
  fromStr: string,
  toStr: string
): number {
  const completedSet = completedDates instanceof Set ? completedDates : new Set(completedDates)
  let dueCount = 0
  let completedDueCount = 0

  let cursor = fromStr
  while (cursor <= toStr) {
    if (isHabitDue(habit, cursor)) {
      dueCount++
      if (completedSet.has(cursor)) {
        completedDueCount++
      }
    }
    cursor = addDaysLocal(cursor, 1)
  }

  if (dueCount === 0) return 0
  return Math.round((completedDueCount / dueCount) * 100)
}
