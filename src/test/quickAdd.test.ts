import { describe, it, expect } from 'vitest'
import { parseQuickAdd } from '../lib/quickAdd'
import { todayLocal, addDaysLocal } from '../lib/dates'

describe('parseQuickAdd parser', () => {
  it('parses basic title with no tokens and defaults toToday=true', () => {
    const res = parseQuickAdd('Call the registrar')
    expect(res.title).toBe('Call the registrar')
    expect(res.toToday).toBe(true)
    expect(res.priority).toBeUndefined()
    expect(res.category).toBeUndefined()
  })

  it('parses priority tokens !crit, !high, !med, !low, !1..4', () => {
    expect(parseQuickAdd('Finish essay !crit').priority).toBe('critical')
    expect(parseQuickAdd('Submit lab report !high').priority).toBe('high')
    expect(parseQuickAdd('Review lecture !med').priority).toBe('medium')
    expect(parseQuickAdd('Buy pencils !low').priority).toBe('low')
    expect(parseQuickAdd('Project draft !1').priority).toBe('critical')
    expect(parseQuickAdd('Reading chapter !2').priority).toBe('high')
  })

  it('parses category tokens #college, #personal, #skill, and course codes', () => {
    const res1 = parseQuickAdd('Submit assignment #college')
    expect(res1.category).toBe('college')
    expect(res1.title).toBe('Submit assignment')

    const res2 = parseQuickAdd('Meditate 15m #personal')
    expect(res2.category).toBe('personal')

    const res3 = parseQuickAdd('Guitar practice #skill')
    expect(res3.category).toBe('skill')

    const res4 = parseQuickAdd('Midterm review #CS101')
    expect(res4.courseId).toBe('CS101')
  })

  it('parses dates: today, tomorrow, next week, in N days', () => {
    const todayStr = todayLocal()
    const tomorrowStr = addDaysLocal(todayStr, 1)
    const in3DaysStr = addDaysLocal(todayStr, 3)
    const nextWeekStr = addDaysLocal(todayStr, 7)

    expect(parseQuickAdd('Study chemistry today').dueDate).toBe(todayStr)
    expect(parseQuickAdd('Study chemistry today').toToday).toBe(true)

    expect(parseQuickAdd('Study chemistry tomorrow').dueDate).toBe(tomorrowStr)
    expect(parseQuickAdd('Study chemistry tomorrow').toToday).toBe(false)

    expect(parseQuickAdd('Dentist appointment in 3 days').dueDate).toBe(in3DaysStr)
    expect(parseQuickAdd('Project milestone next week').dueDate).toBe(nextWeekStr)
  })

  it('parses duration estimates (h, m, h+m)', () => {
    expect(parseQuickAdd('Deep work 2h').estimateMin).toBe(120)
    expect(parseQuickAdd('Quick email 15m').estimateMin).toBe(15)
    expect(parseQuickAdd('Math problem set 1h30m').estimateMin).toBe(90)
  })

  it('parses combined complex sentence correctly', () => {
    const res = parseQuickAdd('Submit final draft !crit #college tomorrow 1h30m 5pm')
    expect(res.title).toBe('Submit final draft')
    expect(res.priority).toBe('critical')
    expect(res.category).toBe('college')
    expect(res.dueDate).toBe(addDaysLocal(todayLocal(), 1))
    expect(res.estimateMin).toBe(90)
    expect(res.dueTime).toBe('17:00:00')
    expect(res.toToday).toBe(false)
  })

  it('parses "write report by 5pm 45m" into dueTime 17:00:00 and estimateMin 45', () => {
    const res = parseQuickAdd('write report by 5pm 45m')
    expect(res.title).toBe('write report')
    expect(res.dueTime).toBe('17:00:00')
    expect(res.estimateMin).toBe(45)
  })

  it('builds createTask payload containing due_time, estimate_min, and null energy_level', () => {
    const parsed = parseQuickAdd('write report by 5pm 45m')
    const payload = {
      title: parsed.title,
      priority: parsed.priority || 'medium',
      category: parsed.category || 'personal',
      due_date: parsed.dueDate || null,
      due_time: parsed.dueTime || null,
      estimate_min: parsed.estimateMin || null,
      energy_level: null,
      pin_to_today: parsed.toToday,
    }

    expect(payload.due_time).toBe('17:00:00')
    expect(payload.estimate_min).toBe(45)
    expect(payload.energy_level).toBeNull()
  })
})
