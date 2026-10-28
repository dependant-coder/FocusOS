import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { todayLocal, addDaysLocal } from '../lib/dates'
import type { DailyTodo } from '../types'
import toast from 'react-hot-toast'

export interface Habit {
  id: string
  user_id: string
  name: string
  icon: string
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom'
  custom_days: string[]
  active: boolean
  sort_order: number
  created_at: string
}

export interface HabitLog {
  id: string
  habit_id: string
  user_id: string
  date: string
  completed: boolean
}

/** Fetch all active habits for the current user */
export function useHabits() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['habits', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habits')
        .select('*')
        .eq('user_id', user!.id)
        .eq('active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return data as Habit[]
    },
  })
}

/** Fetch habit logs for the last N days */
export function useHabitLogs(days = 30) {
  const { user } = useAuth()
  const startStr = addDaysLocal(todayLocal(), -days)

  return useQuery({
    queryKey: ['habit_logs', user?.id, days],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habit_logs')
        .select('*')
        .eq('user_id', user!.id)
        .gte('date', startStr)
        .order('date', { ascending: true })

      if (error) throw error
      return data as HabitLog[]
    },
  })
}

/** Create a new habit (idempotent with client-generated UUID) */
export function useCreateHabit() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async (habit: {
      id?: string
      name: string
      icon: string
      frequency: string
      custom_days?: string[]
    }) => {
      const id = habit.id || crypto.randomUUID()
      const { data, error } = await supabase
        .from('habits')
        .upsert(
          {
            id,
            user_id: user!.id,
            name: habit.name,
            icon: habit.icon,
            frequency: habit.frequency,
            custom_days: habit.custom_days || [],
          },
          { ignoreDuplicates: true }
        )
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
    },
    onError: () => {
      toast.error('Failed to create habit')
    },
  })
}

/** Update a habit */
export function useUpdateHabit() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: Partial<Habit> & { id: string }) => {
      const { error } = await supabase
        .from('habits')
        .update(updates)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
    },
    onError: () => {
      toast.error('Failed to update')
    },
  })
}

/** Soft-delete a habit (set active = false) */
export function useDeleteHabit() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('habits')
        .update({ active: false })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] })
      toast.success('Habit archived')
    },
    onError: () => {
      toast.error('Failed to archive')
    },
  })
}

/** Toggle a habit log for today (optimistic) */
export function useToggleHabitLog() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: async ({
      habitId,
      date,
      completed,
    }: {
      habitId: string
      date: string
      completed: boolean
    }) => {
      const { error } = await supabase.from('habit_logs').upsert(
        {
          habit_id: habitId,
          user_id: user!.id,
          date,
          completed,
        },
        { onConflict: 'habit_id,date' }
      )

      if (error) throw error

      // Bidirectional sync: update matching daily_todos
      await supabase
        .from('daily_todos')
        .update({ done: completed })
        .eq('user_id', user!.id)
        .eq('habit_id', habitId)
        .eq('date', date)
    },
    onMutate: async ({ habitId, date, completed }) => {
      const key = ['habit_logs', user?.id, 30]
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<HabitLog[]>(key)

      qc.setQueryData<HabitLog[]>(key, (old = []) => {
        const exists = old.find(
          (l) => l.habit_id === habitId && l.date === date
        )
        if (exists) {
          return old.map((l) =>
            l.habit_id === habitId && l.date === date
              ? { ...l, completed }
              : l
          )
        }
        return [
          ...old,
          {
            id: crypto.randomUUID(),
            habit_id: habitId,
            user_id: user!.id,
            date,
            completed,
          },
        ]
      })

      // Optimistic update for daily_todos cache if active for this date
      const dailyKey = ['daily_todos', user?.id, date]
      qc.setQueryData<DailyTodo[]>(dailyKey, (old) => {
        if (!old) return old
        return old.map((t) => (t.habit_id === habitId ? { ...t, done: completed } : t))
      })

      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        qc.setQueryData(['habit_logs', user?.id, 30], ctx.prev)
      }
      toast.error('Failed to update')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['habit_logs'] })
      qc.invalidateQueries({ queryKey: ['daily_todos'] })
    },
  })
}
