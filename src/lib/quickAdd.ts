import { z } from 'zod'
import { todayLocal, addDaysLocal } from './dates'
import type { Priority, Category } from '../types'

export const QuickAddParsedSchema = z.object({
  title: z.string(),
  priority: z.enum(['critical', 'high', 'medium', 'low']).optional(),
  category: z.enum(['college', 'personal', 'skill']).optional(),
  courseId: z.string().optional(),
  dueDate: z.string().optional(), // YYYY-MM-DD
  dueTime: z.string().optional(), // HH:MM:SS
  estimateMin: z.number().int().positive().optional(),
  toToday: z.boolean(),
})

export type QuickAddParsed = z.infer<typeof QuickAddParsedSchema>

const WEEKDAY_NAMES: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
}

const MONTH_NAMES: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
}

function getNextWeekdayDate(targetDay: number, fromDate: Date = new Date()): string {
  const currentDay = fromDate.getDay()
  let daysAhead = targetDay - currentDay
  if (daysAhead <= 0) {
    daysAhead += 7
  }
  const target = new Date(fromDate)
  target.setDate(fromDate.getDate() + daysAhead)
  const y = target.getFullYear()
  const m = String(target.getMonth() + 1).padStart(2, '0')
  const d = String(target.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatMonthDay(monthIdx: number, day: number, fromDate: Date = new Date()): string {
  let year = fromDate.getFullYear()
  const candidate = new Date(year, monthIdx, day)
  // If date already passed by more than 1 day this year, schedule for next year
  if (candidate.getTime() < fromDate.getTime() - 86400000) {
    year += 1
  }
  const m = String(monthIdx + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

/**
 * Parses a free-form string into structured task properties.
 * Extracts tokens (!priority, #category, dates, times, estimates) and cleans the title.
 */
export function parseQuickAdd(input: string, referenceDate: Date = new Date()): QuickAddParsed {
  if (!input || !input.trim()) {
    return {
      title: '',
      toToday: true,
    }
  }

  let text = input.trim()
  let priority: Priority | undefined
  let category: Category | undefined
  let courseId: string | undefined
  let dueDate: string | undefined
  let dueTime: string | undefined
  let estimateMin: number | undefined

  const todayStr = todayLocal()

  // 1. Priority: !crit, !critical, !1, !high, !2, !med, !medium, !3, !low, !4
  text = text.replace(/(?:^|\s)!(crit(?:ical)?|high|med(?:ium)?|low|[1-4])(?=\s|$)/i, (_, p) => {
    const val = p.toLowerCase()
    if (val === 'crit' || val === 'critical' || val === '1') priority = 'critical'
    else if (val === 'high' || val === '2') priority = 'high'
    else if (val === 'med' || val === 'medium' || val === '3') priority = 'medium'
    else if (val === 'low' || val === '4') priority = 'low'
    return ''
  })

  // 2. Category / Course: #college, #personal, #skill, or #CS101 (course)
  text = text.replace(/(?:^|\s)#([a-z0-9_-]+)(?=\s|$)/i, (_, cat) => {
    const val = cat.toLowerCase()
    if (val === 'college' || val === 'personal' || val === 'skill') {
      category = val as Category
    } else {
      courseId = cat.toUpperCase()
    }
    return ''
  })

  // 3. Estimate: 1h30m, 2h, 45m, 90 min
  text = text.replace(/(?:^|\s)(?:for\s+)?(?:approx\s+)?(\d+)\s*h(?:our)?s?\s*(\d+)\s*m(?:in)?s?(?=\s|$)/i, (_, h, m) => {
    estimateMin = parseInt(h, 10) * 60 + parseInt(m, 10)
    return ''
  })

  if (!estimateMin) {
    text = text.replace(/(?:^|\s)(?:for\s+)?(?:approx\s+)?(\d+)\s*h(?:our)?s?(?=\s|$)/i, (_, h) => {
      estimateMin = parseInt(h, 10) * 60
      return ''
    })
  }

  if (!estimateMin) {
    text = text.replace(/(?:^|\s)(?:for\s+)?(?:approx\s+)?(\d+)\s*m(?:in)?s?(?=\s|$)/i, (_, m) => {
      estimateMin = parseInt(m, 10)
      return ''
    })
  }

  // 4. Time: by 5pm, at 17:30, 11:59pm, 9:00 am
  text = text.replace(/(?:^|\s)(?:by|at|due\s+at)?\s*(\d{1,2}):(\d{2})\s*(am|pm)?(?=\s|$)/i, (_, h, m, mer) => {
    let hour = parseInt(h, 10)
    const min = parseInt(m, 10)
    if (mer) {
      const isPm = mer.toLowerCase() === 'pm'
      if (isPm && hour < 12) hour += 12
      if (!isPm && hour === 12) hour = 0
    }
    dueTime = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`
    return ''
  })

  if (!dueTime) {
    text = text.replace(/(?:^|\s)(?:by|at|due\s+at)?\s*(\d{1,2})\s*(am|pm)(?=\s|$)/i, (_, h, mer) => {
      let hour = parseInt(h, 10)
      const isPm = mer.toLowerCase() === 'pm'
      if (isPm && hour < 12) hour += 12
      if (!isPm && hour === 12) hour = 0
      dueTime = `${String(hour).padStart(2, '0')}:00:00`
      return ''
    })
  }

  // 5. Date: today, tomorrow, next week, in N days
  text = text.replace(/(?:^|\s)(?:due\s+)?(today)(?=\s|$)/i, () => {
    dueDate = todayStr
    return ''
  })

  if (!dueDate) {
    text = text.replace(/(?:^|\s)(?:due\s+)?(tomorrow)(?=\s|$)/i, () => {
      dueDate = addDaysLocal(todayStr, 1)
      return ''
    })
  }

  if (!dueDate) {
    text = text.replace(/(?:^|\s)(?:due\s+)?next\s+week(?=\s|$)/i, () => {
      dueDate = addDaysLocal(todayStr, 7)
      return ''
    })
  }

  if (!dueDate) {
    text = text.replace(/(?:^|\s)(?:due\s+)?in\s+(\d+)\s+days?(?=\s|$)/i, (_, days) => {
      dueDate = addDaysLocal(todayStr, parseInt(days, 10))
      return ''
    })
  }

  // Next weekday: mon..sun, monday..sunday
  if (!dueDate) {
    const weekdayRegex = new RegExp(
      `(?:^|\\s)(?:due\\s+)?(?:on\\s+)?(${Object.keys(WEEKDAY_NAMES).join('|')})(?=\\s|$)`,
      'i'
    )
    text = text.replace(weekdayRegex, (_, dayStr) => {
      const dayNum = WEEKDAY_NAMES[dayStr.toLowerCase()]
      if (dayNum !== undefined) {
        dueDate = getNextWeekdayDate(dayNum, referenceDate)
      }
      return ''
    })
  }

  // Specific month date: oct 30, october 30, 30 oct
  if (!dueDate) {
    const monthsPattern = Object.keys(MONTH_NAMES).join('|')
    const monthFirstRegex = new RegExp(
      `(?:^|\\s)(?:due\\s+)?(?:on\\s+)?(${monthsPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?=\\s|$)`,
      'i'
    )
    text = text.replace(monthFirstRegex, (_, mStr, dStr) => {
      const monthIdx = MONTH_NAMES[mStr.toLowerCase()]
      const day = parseInt(dStr, 10)
      if (monthIdx !== undefined && day >= 1 && day <= 31) {
        dueDate = formatMonthDay(monthIdx, day, referenceDate)
      }
      return ''
    })
  }

  // Numeric date: 30/10 or 10/30 (if year omitted)
  if (!dueDate) {
    text = text.replace(/(?:^|\s)(?:due\s+)?(?:on\s+)?(\d{1,2})\/(\d{1,2})(?=\s|$)/i, (_, p1, p2) => {
      const n1 = parseInt(p1, 10)
      const n2 = parseInt(p2, 10)
      let monthIdx: number
      let day: number
      if (n1 > 12 && n2 <= 12) {
        // DD/MM
        day = n1
        monthIdx = n2 - 1
      } else {
        // MM/DD
        monthIdx = n1 - 1
        day = n2
      }
      if (monthIdx >= 0 && monthIdx < 12 && day >= 1 && day <= 31) {
        dueDate = formatMonthDay(monthIdx, day, referenceDate)
      }
      return ''
    })
  }

  // Clean title: collapse spaces, remove dangling punctuation
  const cleanTitle = text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[,.-]\s*|\s*[,.-]$/g, '')

  // Default toToday logic:
  // If dueDate is today or no date specified at all, default toToday = true
  const toToday = !dueDate || dueDate === todayStr

  const result: QuickAddParsed = {
    title: cleanTitle || input.trim(),
    priority,
    category,
    courseId,
    dueDate,
    dueTime,
    estimateMin,
    toToday,
  }

  return QuickAddParsedSchema.parse(result)
}
