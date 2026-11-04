import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { todayLocal, addDaysLocal, endOfWeekLocal } from '../lib/dates'
import { isHabitDue } from '../lib/habits'
import type { WeeklyReview, Habit } from '../types'
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

      // Fetch daily_todos for the week to compute best day
      const { data: dailyTodos, error: dailyTodosErr } = await supabase
        .from('daily_todos')
        .select('date, done, type')
        .eq('user_id', user.id)
        .gte('date', weekStart)
        .lte('date', weekEnd)

      if (dailyTodosErr) throw dailyTodosErr

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

      // Stored review has valid stats ONLY if completion_rate is NOT NULL
      if (stored && stored.completion_rate !== null) {
        return {
          ...stored,
          isLive: false,
          bestDay,
        }
      }

      // Compute live stats matching supabase/functions/weekly-review/index.ts definitions
      // 1. Completed tasks: status 'done' and completed_at within [weekStart 00:00 local, next Monday 00:00 local)
      const nextWeekStart = addDaysLocal(weekStart, 7)
      const weekStartUtcIso = new Date(`${weekStart}T00:00:00`).toISOString()
      const nextWeekStartUtcIso = new Date(`${nextWeekStart}T00:00:00`).toISOString()

      const { count: completedCount, error: completedErr } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'done')
        .gte('completed_at', weekStartUtcIso)
        .lt('completed_at', nextWeekStartUtcIso)

      if (completedErr) throw completedErr

      // 2. Missed tasks: due_date within the week and status != 'done'
      const { count: missedCount, error: missedErr } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .neq('status', 'done')
        .gte('due_date', weekStart)
        .lte('due_date', weekEnd)

      if (missedErr) throw missedErr

      // 3. Carried over daily_todos in the week
      const { count: carriedCount, error: carriedErr } = await supabase
        .from('daily_todos')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .eq('carry_over', true)

      if (carriedErr) throw carriedErr

      // 4. Habits due = per habit per day in week (from created_at date, capped at today), done = completed habit_logs
      const { data: habits, error: habitsErr } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user.id)
        .eq('active', true)

      if (habitsErr) throw habitsErr

      const { count: habitsDoneCount, error: logsErr } = await supabase
        .from('habit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .eq('completed', true)

      if (logsErr) throw logsErr

      let habitsDue = 0
      let cur = weekStart
      const endDate = weekEnd < today ? weekEnd : today

      while (cur <= endDate) {
        for (const h of (habits as Habit[] ?? [])) {
          if (isHabitDue(h, cur)) {
            habitsDue++
          }
        }
        cur = addDaysLocal(cur, 1)
      }

      const tasksCompleted = completedCount ?? 0
      const tasksMissed = missedCount ?? 0
      const totalTasks = tasksCompleted + tasksMissed
      const taskCompletionRate = totalTasks > 0 ? Math.round((tasksCompleted / totalTasks) * 100) : 0

      const habitsDone = habitsDoneCount ?? 0
      const habitCompletionRate = habitsDue > 0 ? Math.round((habitsDone / habitsDue) * 100) : 0

      if (stored) {
        // Return merged live stats with stored reflection fields
        return {
          ...stored,
          tasks_completed: tasksCompleted,
          tasks_missed: tasksMissed,
          completion_rate: taskCompletionRate,
          habits_due: habitsDue,
          habits_done: habitsDone,
          habit_completion_rate: habitCompletionRate,
          carried_over_count: carriedCount ?? 0,
          focus_minutes: stored.focus_minutes ?? 0,
          wins: stored.wins,
          blockers: stored.blockers,
          next_priorities: stored.next_priorities,
          isLive: true,
          bestDay,
        }
      }

      return {
        id: 'live-' + weekStart,
        user_id: user.id,
        week_start: weekStart,
        tasks_completed: tasksCompleted,
        tasks_missed: tasksMissed,
        completion_rate: taskCompletionRate,
        habits_due: habitsDue,
        habits_done: habitsDone,
        habit_completion_rate: habitCompletionRate,
        carried_over_count: carriedCount ?? 0,
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
