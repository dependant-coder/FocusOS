import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { todayLocal, addDaysLocal, parseLocalDate, format } from '../lib/dates'
import { isHabitDue, longestStreak as calculateLongestStreak } from '../lib/habits'
import type { Task, Habit, HabitLog } from '../types'

export type AnalyticsRange = 7 | 30 | 90

const PAGE_SIZE = 1000

/**
 * Fetch completed tasks in range using completed_at >= rangeStartIso,
 * falling back to updated_at when completed_at is null via .or().
 * Paginates with .range() in pages of 1000.
 */
async function fetchCompletedTasksInRange(
  uid: string,
  rangeStartIso: string,
  columns: string
): Promise<Partial<Task>[]> {
  const allTasks: Partial<Task>[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('tasks')
      .select(columns)
      .eq('user_id', uid)
      .eq('status', 'done')
      .or(`completed_at.gte.${rangeStartIso},and(completed_at.is.null,updated_at.gte.${rangeStartIso})`)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    allTasks.push(...(data as Partial<Task>[]))
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return allTasks
}

/** Fetch task completions per day based on tasks.completed_at */
export function useTaskCompletionTrend(rangeDays: AnalyticsRange = 30) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['analytics', 'completionTrend', user?.id, rangeDays],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return []

      const today = todayLocal()
      const startDate = addDaysLocal(today, -(rangeDays - 1))
      const rangeStartIso = new Date(`${startDate}T00:00:00`).toISOString()

      // Fetch completed tasks within range
      const tasks = await fetchCompletedTasksInRange(
        user.id,
        rangeStartIso,
        'id, category, completed_at, updated_at, created_at'
      )

      // Generate all local days in the range
      const dayCounts: Record<string, number> = {}
      let cur = startDate
      while (cur <= today) {
        dayCounts[cur] = 0
        cur = addDaysLocal(cur, 1)
      }

      // Tally tasks using local date of completed_at (or fallback to updated_at / created_at)
      tasks.forEach((t) => {
        const timestamp = t.completed_at || t.updated_at || t.created_at
        if (!timestamp) return
        const localDate = format(new Date(timestamp), 'yyyy-MM-dd')
        if (dayCounts[localDate] !== undefined) {
          dayCounts[localDate]++
        }
      })

      return Object.entries(dayCounts).map(([dateStr, count]) => {
        const d = parseLocalDate(dateStr)
        return {
          fullDate: dateStr,
          date: rangeDays === 7 ? format(d, 'EEE') : format(d, 'MMM d'),
          completed: count,
        }
      })
    },
  })
}

/** Fetch category split for completed tasks */
export function useCategoryDistribution(rangeDays: AnalyticsRange = 30) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['analytics', 'categorySplit', user?.id, rangeDays],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return []

      const today = todayLocal()
      const startDate = addDaysLocal(today, -(rangeDays - 1))
      const rangeStartIso = new Date(`${startDate}T00:00:00`).toISOString()

      const tasks = await fetchCompletedTasksInRange(
        user.id,
        rangeStartIso,
        'category, completed_at, updated_at, created_at'
      )

      const counts: Record<string, number> = {
        college: 0,
        personal: 0,
        skill: 0,
      }

      tasks.forEach((t) => {
        const timestamp = t.completed_at || t.updated_at || t.created_at
        if (!timestamp) return
        const localDate = format(new Date(timestamp), 'yyyy-MM-dd')
        if (localDate >= startDate && localDate <= today) {
          const cat = t.category || 'personal'
          if (counts[cat] !== undefined) {
            counts[cat]++
          } else {
            counts[cat] = 1
          }
        }
      })

      return Object.entries(counts).map(([name, value]) => ({ name, value }))
    },
  })
}

/** Fetch weekly completion rates over the last 12 weeks, skipping weeks where completion_rate is null */
export function useWeeklyCompletionTrend() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['analytics', 'weeklyTrend', user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return []

      const { data, error } = await supabase
        .from('weekly_reviews')
        .select('week_start, completion_rate')
        .eq('user_id', user.id)
        .not('completion_rate', 'is', null)
        .order('week_start', { ascending: false })
        .limit(12)

      if (error) throw error

      // Skip weeks where completion_rate is null instead of plotting 0
      const validReviews = (data || []).filter(
        (r) => r.completion_rate !== null && r.completion_rate !== undefined
      )
      const reversed = [...validReviews].reverse()
      return reversed.map((r) => {
        const d = parseLocalDate(r.week_start)
        return {
          week: format(d, 'MMM d'),
          rate: r.completion_rate as number,
        }
      })
    },
  })
}

/** Frequency-aware habit heatmap */
export function useHabitHeatmap(rangeDays: AnalyticsRange = 30) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['analytics', 'habitHeatmap', user?.id, rangeDays],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return []

      const today = todayLocal()
      const startDate = addDaysLocal(today, -(rangeDays - 1))

      // 1. Active habits
      const { data: habits, error: habitsErr } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)
        .order('sort_order')

      if (habitsErr) throw habitsErr

      // 2. Logs within the date range
      const { data: logs, error: logsErr } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', today)

      if (logsErr) throw logsErr

      // Generate days array
      const days: string[] = []
      let cur = startDate
      while (cur <= today) {
        days.push(cur)
        cur = addDaysLocal(cur, 1)
      }

      const logMap = new Map<string, boolean>()
      ;(logs as HabitLog[] ?? []).forEach((l) => {
        if (l.completed) {
          logMap.set(`${l.habit_id}_${l.date}`, true)
        }
      })

      return (habits as Habit[] ?? []).map((h) => {
        const dayEntries = days.map((dateStr) => {
          const isDue = isHabitDue(h, dateStr)
          const isCompleted = logMap.has(`${h.id}_${dateStr}`)
          return {
            date: dateStr,
            isDue,
            completed: isCompleted,
          }
        })

        return {
          id: h.id,
          name: h.name,
          icon: h.icon || '🎯',
          days: dayEntries,
        }
      })
    },
  })
}

/** Stat cards & productivity insights */
export function useAnalyticsSummary(rangeDays: AnalyticsRange = 30) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['analytics', 'summary', user?.id, rangeDays],
    enabled: !!user,
    queryFn: async () => {
      if (!user) {
        return {
          tasksInRange: 0,
          allTimeCompleted: 0,
          bestWeekday: null,
          longestStreak: 0,
          habitConsistencyRate: 0,
        }
      }

      const today = todayLocal()
      const startDate = addDaysLocal(today, -(rangeDays - 1))
      const rangeStartIso = new Date(`${startDate}T00:00:00`).toISOString()

      // 1. Fetch completed tasks in range
      const tasks = await fetchCompletedTasksInRange(
        user.id,
        rangeStartIso,
        'id, completed_at, updated_at, created_at'
      )

      // 2. Fetch all-time completed count without fetching all rows
      const { count: allTimeCount, error: countErr } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'done')

      if (countErr) throw countErr

      let tasksInRange = 0
      const weekdayCounts: Record<string, number> = {
        Monday: 0,
        Tuesday: 0,
        Wednesday: 0,
        Thursday: 0,
        Friday: 0,
        Saturday: 0,
        Sunday: 0,
      }

      tasks.forEach((t) => {
        const ts = t.completed_at || t.updated_at || t.created_at
        if (!ts) return
        const d = new Date(ts)
        const localDate = format(d, 'yyyy-MM-dd')
        if (localDate >= startDate && localDate <= today) {
          tasksInRange++
          const weekdayName = format(d, 'EEEE')
          if (weekdayCounts[weekdayName] !== undefined) {
            weekdayCounts[weekdayName]++
          }
        }
      })

      let bestWeekday: string | null = null
      let maxDayCount = 0
      Object.entries(weekdayCounts).forEach(([day, count]) => {
        if (count > maxDayCount) {
          maxDayCount = count
          bestWeekday = day
        }
      })

      // 2. Habits & streaks
      const { data: habits } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)

      const { data: habitLogs } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed', true)

      let longestStreak = 0
      const habitMap = new Map((habits as Habit[] ?? []).map((h) => [h.id, h]))
      const logsByHabit: Record<string, string[]> = {}
      ;(habitLogs as HabitLog[] ?? []).forEach((l) => {
        if (!logsByHabit[l.habit_id]) logsByHabit[l.habit_id] = []
        logsByHabit[l.habit_id].push(l.date)
      })

      Object.entries(logsByHabit).forEach(([habitId, dates]) => {
        const habit = habitMap.get(habitId) || { frequency: 'daily' }
        const max = calculateLongestStreak(habit as Habit, dates)
        if (max > longestStreak) longestStreak = max
      })

      // Consistency in range
      let totalDue = 0
      let totalDone = 0
      const completedSet = new Set((habitLogs as HabitLog[] ?? []).map((l) => `${l.habit_id}_${l.date}`))

      let cur = startDate
      while (cur <= today) {
        for (const h of (habits as Habit[] ?? []).filter((h) => h.active)) {
          if (isHabitDue(h, cur)) {
            totalDue++
            if (completedSet.has(`${h.id}_${cur}`)) {
              totalDone++
            }
          }
        }
        cur = addDaysLocal(cur, 1)
      }

      const habitConsistencyRate = totalDue > 0 ? Math.round((totalDone / totalDue) * 100) : 0

      // 3. Focus minutes in range
      let focusMinutesInRange = 0
      try {
        const { data: focusRows } = await supabase
          .from('focus_sessions')
          .select('actual_seconds')
          .eq('user_id', user.id)
          .eq('kind', 'focus')
          .in('status', ['completed', 'stopped'])
          .gte('started_at', rangeStartIso)

        if (focusRows) {
          const totalSec = focusRows.reduce((acc, row) => acc + (row.actual_seconds || 0), 0)
          focusMinutesInRange = Math.round(totalSec / 60)
        }
      } catch {
        // Fallback gracefully if focus_sessions query fails
      }

      return {
        tasksInRange,
        allTimeCompleted: allTimeCount ?? 0,
        bestWeekday: maxDayCount > 0 ? bestWeekday : null,
        longestStreak,
        habitConsistencyRate,
        focusMinutesInRange,
      }
    },
  })
}

/** Fetch focus minutes per day based on focus_sessions.started_at */
export function useFocusTrend(rangeDays: AnalyticsRange = 30) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['analytics', 'focusTrend', user?.id, rangeDays],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return []

      const today = todayLocal()
      const startDate = addDaysLocal(today, -(rangeDays - 1))
      const rangeStartIso = new Date(`${startDate}T00:00:00`).toISOString()

      const rows: { actual_seconds: number | null; started_at: string }[] = []
      let from = 0

      while (true) {
        const { data, error } = await supabase
          .from('focus_sessions')
          .select('actual_seconds, started_at')
          .eq('user_id', user.id)
          .eq('kind', 'focus')
          .in('status', ['completed', 'stopped'])
          .gte('started_at', rangeStartIso)
          .order('id', { ascending: true })
          .range(from, from + PAGE_SIZE - 1)

        if (error) throw error
        if (!data || data.length === 0) break

        rows.push(...data)
        if (data.length < PAGE_SIZE) break
        from += PAGE_SIZE
      }

      // Generate all local days in the range
      const daySeconds: Record<string, number> = {}
      let cur = startDate
      while (cur <= today) {
        daySeconds[cur] = 0
        cur = addDaysLocal(cur, 1)
      }

      rows.forEach((s) => {
        if (!s.started_at) return
        const localDate = format(new Date(s.started_at), 'yyyy-MM-dd')
        if (daySeconds[localDate] !== undefined) {
          daySeconds[localDate] += s.actual_seconds || 0
        }
      })

      return Object.entries(daySeconds).map(([dateStr, sec]) => {
        const d = parseLocalDate(dateStr)
        return {
          fullDate: dateStr,
          date: rangeDays === 7 ? format(d, 'EEE') : format(d, 'MMM d'),
          minutes: Math.round(sec / 60),
        }
      })
    },
  })
}

// Backwards compatibility aliases
export const useBarChartData = useTaskCompletionTrend
export const useDonutChartData = useCategoryDistribution
export const useLineChartData = useWeeklyCompletionTrend
export const useHabitHeatmapData = useHabitHeatmap
export const useStatCardsData = useAnalyticsSummary
