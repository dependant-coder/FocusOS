import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { todayLocal, addDaysLocal, endOfWeekLocal } from '../lib/dates'
import { isHabitDue } from '../lib/habits'
import type { WeeklyReview, Habit, HabitLog } from '../types'
import toast from 'react-hot-toast'

export interface WeeklyReviewWithLive extends WeeklyReview {
  isLive?: boolean
  bestDay?: string | null
}

/** Fetch weekly review row, or compute live stats client-side if no row exists */
export function useWeekly(weekStart: string) {
  const { user } = useAuth()

  return useQuery<WeeklyReviewWithLive | null>({
    queryKey: ['weekly', user?.id, weekStart],
    enabled: !!user,
    queryFn: async () => {
      if (!user) return null

      // 1. Check if stored review exists
      const { data: stored, error } = await supabase
        .from('weekly_reviews')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .maybeSingle()

      if (error && error.code !== 'PGRST116') throw error

      const weekEnd = endOfWeekLocal(weekStart)
      const today = todayLocal()

      // Fetch daily_todos for the week to compute best day and/or live stats
      const { data: dailyTodos } = await supabase
        .from('daily_todos')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', weekStart)
        .lte('date', weekEnd)

      // Calculate best day of week for completions
      const dayCompletions: Record<string, number> = {}
      dailyTodos?.filter((t) => t.done && t.type !== 'habit').forEach((t) => {
        dayCompletions[t.date] = (dayCompletions[t.date] || 0) + 1
      })

      let bestDay: string | null = null
      let maxCount = 0
      Object.entries(dayCompletions).forEach(([d, count]) => {
        if (count > maxCount) {
          maxCount = count
          bestDay = d
        }
      })

      if (stored) {
        return {
          ...stored,
          isLive: false,
          bestDay,
        }
      }

      // If no stored review exists, compute live stats client-side
      const taskTodos = dailyTodos?.filter((t) => t.type !== 'habit') ?? []
      const tasksCompleted = taskTodos.filter((t) => t.done).length
      const tasksMissed = taskTodos.filter((t) => !t.done && t.date < today).length
      const carriedCount = taskTodos.filter((t) => t.carry_over || (t.carry_count && t.carry_count > 0)).length
      const totalTasks = tasksCompleted + tasksMissed
      const completionRate = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0

      // Compute habits due & done for this week
      const { data: habits } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)

      const { data: habitLogs } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .eq('completed', true)

      let habitsDue = 0
      let habitsDone = 0

      // Iterate over days from weekStart to weekEnd (capped at today for past/current week)
      let cur = weekStart
      const endDate = weekEnd < today ? weekEnd : today
      const completedSet = new Set((habitLogs as HabitLog[] ?? []).map((l) => `${l.habit_id}_${l.date}`))

      while (cur <= endDate) {
        for (const h of (habits as Habit[] ?? [])) {
          if (isHabitDue(h, cur)) {
            habitsDue++
            if (completedSet.has(`${h.id}_${cur}`)) {
              habitsDone++
            }
          }
        }
        cur = addDaysLocal(cur, 1)
      }

      const habitRate = habitsDue > 0 ? Math.round((habitsDone / habitsDue) * 100) : 0

      return {
        id: 'live-' + weekStart,
        user_id: user.id,
        week_start: weekStart,
        tasks_completed: tasksCompleted,
        tasks_missed: tasksMissed,
        completion_rate: completionRate,
        habits_due: habitsDue,
        habits_done: habitsDone,
        habit_completion_rate: habitRate,
        carried_over_count: carriedCount,
        focus_minutes: 0,
        wins: null,
        blockers: null,
        next_priorities: null,
        created_at: null,
        updated_at: null,
        isLive: true,
        bestDay,
      }
    },
  })
}

/** Update reflections only via upsert. NEVER overwrites stats columns. */
export function useUpdateWeekly() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      weekStart,
      wins,
      blockers,
      nextPriorities,
    }: {
      weekStart: string
      wins?: string | null
      blockers?: string | null
      nextPriorities?: string | null
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const payload: {
        user_id: string
        week_start: string
        wins?: string | null
        blockers?: string | null
        next_priorities?: string | null
        updated_at: string
      } = {
        user_id: user.id,
        week_start: weekStart,
        updated_at: new Date().toISOString(),
      }

      if (wins !== undefined) payload.wins = wins
      if (blockers !== undefined) payload.blockers = blockers
      if (nextPriorities !== undefined) payload.next_priorities = nextPriorities

      // Upsert reflection fields ONLY. Never touches stats columns.
      const { error } = await supabase
        .from('weekly_reviews')
        .upsert(payload, { onConflict: 'user_id,week_start' })

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly'] })
    },
    onError: (err) => {
      toast.error(`Failed to save reflection: ${err.message}`)
    },
  })
}

/** Convert items into tasks scheduled for next Monday */
export function usePlanNextWeek() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      items,
      nextMonday,
    }: {
      items: string[]
      nextMonday: string
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const taskInserts = items
        .filter((t) => t.trim().length > 0)
        .map((title) => ({
          id: crypto.randomUUID(),
          user_id: user.id,
          title: title.trim(),
          due_date: nextMonday,
          status: 'not_started',
          priority: 'medium',
          category: 'personal',
          pin_to_today: false,
        }))

      if (taskInserts.length === 0) return []

      const { data, error } = await supabase.from('tasks').insert(taskInserts).select()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
      toast.success(`Created ${data?.length || 0} task(s) for next week!`)
    },
    onError: (err) => {
      toast.error(`Failed to plan next week: ${err.message}`)
    },
  })
}
