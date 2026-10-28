import { describe, it, expect } from 'vitest'
import {
  isHabitDue,
  currentStreak,
  longestStreak,
  completionRate,
} from '../lib/habits'

describe('habit correctness (P1-10)', () => {
  const weekdaysHabit = {
    id: 'h-weekdays',
    frequency: 'weekdays' as const,
    created_at: '2026-10-01T00:00:00Z',
  }

  const dailyHabit = {
    id: 'h-daily',
    frequency: 'daily' as const,
    created_at: '2026-10-01T00:00:00Z',
  }

  const customHabit = {
    id: 'h-custom',
    frequency: 'custom' as const,
    custom_days: ['mon', 'wed', 'fri'],
    created_at: '2026-10-01T00:00:00Z',
  }

  it('determines isHabitDue accurately based on frequency and custom days', () => {
    // 2026-10-19 is Monday, 2026-10-24 is Saturday, 2026-10-25 is Sunday
    expect(isHabitDue(weekdaysHabit, '2026-10-19')).toBe(true)
    expect(isHabitDue(weekdaysHabit, '2026-10-24')).toBe(false)
    expect(isHabitDue(weekdaysHabit, '2026-10-25')).toBe(false)

    expect(isHabitDue(dailyHabit, '2026-10-24')).toBe(true)
    expect(isHabitDue(dailyHabit, '2026-10-25')).toBe(true)

    expect(isHabitDue(customHabit, '2026-10-19')).toBe(true) // Mon
    expect(isHabitDue(customHabit, '2026-10-20')).toBe(false) // Tue
    expect(isHabitDue(customHabit, '2026-10-21')).toBe(true) // Wed
  })

  it('calculates current streak for weekdays habit completed Mon-Fri then Mon as 6', () => {
    // Mon 2026-10-19 to Fri 2026-10-23 completed (5 days)
    // Weekend 2026-10-24, 2026-10-25 skipped because not due
    // Mon 2026-10-26 completed (6th day)
    const completed = [
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-26',
    ]

    const result = currentStreak(weekdaysHabit, completed, '2026-10-26')
    expect(result.streak).toBe(6)
  })

  it('does not reset streak when today is unchecked', () => {
    // Mon-Fri completed. Today is Mon 2026-10-26, but unchecked (not in completed list)
    const completed = [
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
    ]

    const result = currentStreak(weekdaysHabit, completed, '2026-10-26')
    // Should start from previous due day (Friday 2026-10-23) and report 5
    expect(result.streak).toBe(5)
  })

  it('yields 100% completion rate for weekdays habit completed Mon-Fri across a full week', () => {
    // Week: 2026-10-19 (Mon) to 2026-10-25 (Sun)
    // Due days: Mon, Tue, Wed, Thu, Fri (5 days)
    const completed = [
      '2026-10-19',
      '2026-10-20',
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
    ]

    const rate = completionRate(weekdaysHabit, completed, '2026-10-19', '2026-10-25')
    expect(rate).toBe(100)
  })

  it('tolerates 1 grace day miss when configured with graceDays: 1', () => {
    // Mon, Tue completed, Wed missed, Thu, Fri completed
    const completed = [
      '2026-10-19',
      '2026-10-20',
      // '2026-10-21' missed
      '2026-10-22',
      '2026-10-23',
    ]

    const resultWithGrace = currentStreak(weekdaysHabit, completed, '2026-10-23', { graceDays: 1 })
    expect(resultWithGrace.streak).toBe(4)
    expect(resultWithGrace.graceUsed).toBe(1)

    const resultWithoutGrace = currentStreak(weekdaysHabit, completed, '2026-10-23', { graceDays: 0 })
    expect(resultWithoutGrace.streak).toBe(2)
    expect(resultWithoutGrace.graceUsed).toBe(0)
  })

  it('computes longestStreak accurately over historical due days', () => {
    const completed = [
      '2026-10-05',
      '2026-10-06',
      '2026-10-07', // 3 days
      // 10-08 missed
      '2026-10-12',
      '2026-10-13',
      '2026-10-14',
      '2026-10-15',
      '2026-10-16', // 5 days
    ]

    const max = longestStreak(weekdaysHabit, completed, '2026-10-01', '2026-10-25')
    expect(max).toBe(5)
  })
})
