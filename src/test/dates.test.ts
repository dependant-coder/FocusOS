import { describe, it, expect } from 'vitest'
import {
  localDateString,
  parseLocalDate,
  addDaysLocal,
  startOfWeekLocal,
  todayLocal,
  getLast7Days,
  getDateLabel,
} from '../lib/dates'
import {
  getUserLocalDate,
  getUserDayOfWeek,
  getUserDayName,
  getUserHour,
  addDaysToDateString,
  getLastCompletedWeekRange,
  localMidnightToUtcIso,
  isWeeklyReviewWindow,
  getDaysInWeek,
  computeHabitsDueInWeek,
} from '../../supabase/functions/_shared/dates'

describe('local date helpers (P1-1)', () => {
  it('formats dates in local time without UTC offset truncation', () => {
    expect(localDateString(new Date('2026-10-26T12:00:00'))).toBe('2026-10-26')
    expect(addDaysToDateString('2026-10-26', 5)).toBe('2026-10-31')

    // 2026-10-26T02:30:00+05:30 is 2026-10-25T21:00:00Z in UTC
    const dateAt230AmIst = new Date('2026-10-25T21:00:00.000Z')
    expect(getUserLocalDate('Asia/Kolkata', dateAt230AmIst)).toBe('2026-10-26')
    expect(getUserHour('Asia/Kolkata', dateAt230AmIst)).toBe(2)

    // 2026-10-26T23:30:00-07:00 is 2026-10-27T06:30:00Z in UTC
    const dateAt1130PmPdt = new Date('2026-10-27T06:30:00.000Z')
    expect(getUserLocalDate('America/Los_Angeles', dateAt1130PmPdt)).toBe('2026-10-26')
    expect(getUserHour('America/Los_Angeles', dateAt1130PmPdt)).toBe(23)
  })

  it('calculates startOfWeekLocal correctly with Monday start', () => {
    // Sunday 2026-10-25 must have week start Monday 2026-10-19
    expect(startOfWeekLocal('2026-10-25')).toBe('2026-10-19')
    // Monday 2026-10-26 must have week start Monday 2026-10-26
    expect(startOfWeekLocal('2026-10-26')).toBe('2026-10-26')
  })

  it('adds and subtracts days correctly using addDaysLocal', () => {
    expect(addDaysLocal('2026-10-26', 1)).toBe('2026-10-27')
    expect(addDaysLocal('2026-10-26', -1)).toBe('2026-10-25')
    expect(addDaysLocal('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDaysLocal('2026-03-01', -1)).toBe('2026-02-28')
  })

  it('parses local midnight cleanly without UTC shift', () => {
    const d = parseLocalDate('2026-10-26')
    expect(d.getFullYear()).toBe(2026)
    expect(d.getMonth()).toBe(9) // 0-indexed October
    expect(d.getDate()).toBe(26)
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
  })

  it('getLast7Days returns 7 consecutive dates ending with today', () => {
    const days = getLast7Days()
    expect(days).toHaveLength(7)
    expect(days[6]).toBe(todayLocal())
    expect(days[5]).toBe(addDaysLocal(todayLocal(), -1))
    expect(days[0]).toBe(addDaysLocal(todayLocal(), -6))
  })

  it('getDateLabel identifies Today, Tomorrow, Overdue, and future dates', () => {
    const today = todayLocal()
    const tomorrow = addDaysLocal(today, 1)
    const yesterday = addDaysLocal(today, -1)
    const in3Days = addDaysLocal(today, 3)

    expect(getDateLabel(today)).toBe('Today')
    expect(getDateLabel(tomorrow)).toBe('Tomorrow')
    expect(getDateLabel(yesterday)).toBe('Overdue')
    expect(getDateLabel(in3Days)).toBe('In 3 days')
    expect(getDateLabel(null)).toBeNull()
  })
})

describe('timezone-aware edge function helpers (_shared/dates.ts)', () => {
  it('handles Sunday completions and completed week calculation', () => {
    // Sunday 2026-10-25 at 23:00 in Asia/Kolkata
    // UTC: 2026-10-25 17:30:00
    const sundayNightIst = new Date('2026-10-25T17:30:00Z')
    expect(getUserDayName('Asia/Kolkata', sundayNightIst)).toBe('sun')
    expect(getUserDayOfWeek('Asia/Kolkata', sundayNightIst)).toBe(0)

    // Monday morning 2026-10-26 at 03:00 in Asia/Kolkata
    // UTC: 2026-10-25 21:30:00
    const mondayMorningIst = new Date('2026-10-25T21:30:00Z')
    expect(getUserDayName('Asia/Kolkata', mondayMorningIst)).toBe('mon')
    expect(getUserDayOfWeek('Asia/Kolkata', mondayMorningIst)).toBe(1)
    expect(getUserLocalDate('Asia/Kolkata', mondayMorningIst)).toBe('2026-10-26')

    const weekRange = getLastCompletedWeekRange('Asia/Kolkata', mondayMorningIst)
    // Completed week should be 2026-10-19 to 2026-10-25
    expect(weekRange.weekStart).toBe('2026-10-19')
    expect(weekRange.weekEnd).toBe('2026-10-25')
    expect(weekRange.nextWeekStart).toBe('2026-10-26')
  })

  it('handles America/Los_Angeles when UTC is next day', () => {
    // 2026-10-26 at 23:30 PDT (UTC is 2026-10-27 06:30)
    const latePdt = new Date('2026-10-27T06:30:00Z')
    expect(getUserLocalDate('America/Los_Angeles', latePdt)).toBe('2026-10-26')
    expect(getUserDayName('America/Los_Angeles', latePdt)).toBe('mon')
  })

  it('converts local midnight to exact UTC ISO string across timezones', () => {
    // 2026-10-19 midnight IST (UTC+05:30) is 2026-10-18 18:30:00Z
    expect(localMidnightToUtcIso('2026-10-19', 'Asia/Kolkata')).toBe('2026-10-18T18:30:00.000Z')
    // 2026-10-26 midnight IST is 2026-10-25 18:30:00Z
    expect(localMidnightToUtcIso('2026-10-26', 'Asia/Kolkata')).toBe('2026-10-25T18:30:00.000Z')

    // 2026-10-19 midnight PDT (UTC-07:00) is 2026-10-19 07:00:00Z
    expect(localMidnightToUtcIso('2026-10-19', 'America/Los_Angeles')).toBe('2026-10-19T07:00:00.000Z')
    // 2026-10-26 midnight PDT is 2026-10-26 07:00:00Z
    expect(localMidnightToUtcIso('2026-10-26', 'America/Los_Angeles')).toBe('2026-10-26T07:00:00.000Z')
  })

  it('guarantees Sunday completions are included in the half-open range [weekStart, nextWeekStart)', () => {
    // Week for Asia/Kolkata: weekStart = 2026-10-19, nextWeekStart = 2026-10-26
    const startIso = localMidnightToUtcIso('2026-10-19', 'Asia/Kolkata') // 2026-10-18T18:30:00.000Z
    const nextStartIso = localMidnightToUtcIso('2026-10-26', 'Asia/Kolkata') // 2026-10-25T18:30:00.000Z

    // Sunday 2026-10-25 at 23:45 IST -> UTC 2026-10-25 18:15:00Z
    const sundayNightTask = '2026-10-25T18:15:00.000Z'
    expect(sundayNightTask >= startIso && sundayNightTask < nextStartIso).toBe(true)

    // Monday 2026-10-26 at 00:00 IST -> UTC 2026-10-25 18:30:00Z (belongs to the next week)
    const mondayMorningTask = '2026-10-25T18:30:00.000Z'
    expect(mondayMorningTask < nextStartIso).toBe(false)
  })

  it('validates the weekly review execution window (Monday 00:00-05:59)', () => {
    // Monday at 02:30 IST -> UTC Sunday 21:00
    const monEarlyIst = new Date('2026-10-25T21:00:00.000Z')
    expect(isWeeklyReviewWindow('Asia/Kolkata', monEarlyIst)).toBe(true)

    // Monday at 06:15 IST -> UTC Monday 00:45
    const monLateIst = new Date('2026-10-26T00:45:00.000Z')
    expect(isWeeklyReviewWindow('Asia/Kolkata', monLateIst)).toBe(false)

    // Sunday at 23:30 IST -> UTC Sunday 18:00
    const sunNightIst = new Date('2026-10-25T18:00:00.000Z')
    expect(isWeeklyReviewWindow('Asia/Kolkata', sunNightIst)).toBe(false)
  })

  it('computes habits due in week with frequency and custom days', () => {
    const weekDays = getDaysInWeek('2026-10-19')
    expect(weekDays).toHaveLength(7)
    expect(weekDays[0]).toEqual({ dateStr: '2026-10-19', dayName: 'mon' })
    expect(weekDays[6]).toEqual({ dateStr: '2026-10-25', dayName: 'sun' })

    const habits = [
      { id: 'h1', frequency: 'daily' },
      { id: 'h2', frequency: 'weekdays' },
      { id: 'h3', frequency: 'weekends' },
      { id: 'h4', frequency: 'custom', custom_days: ['mon', 'wed', 'fri'] },
    ]

    const { totalDue, habitDueMap } = computeHabitsDueInWeek(habits, weekDays)
    expect(habitDueMap.get('h1')).toBe(7)
    expect(habitDueMap.get('h2')).toBe(5)
    expect(habitDueMap.get('h3')).toBe(2)
    expect(habitDueMap.get('h4')).toBe(3)
    expect(totalDue).toBe(17)
  })
})
